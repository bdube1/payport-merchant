import axios from 'axios';

// Same safe pattern as payport-ops and payport-consumer: defaults to the
// real production API, never to localhost, so a missing env override
// can't silently break a production build. Local dev gets localhost via
// .env.development.local (mode-specific, verified not to leak into
// `npm run build`), never by changing this fallback.
const BASE = import.meta.env.VITE_API_URL || 'https://api.payport.africa';

// "Remember me" toggles which storage a session lives in -- localStorage
// persists across browser restarts, sessionStorage clears when the tab
// closes. Everything that reads/writes the session checks both, since at
// read time (e.g. on page load) we don't know which one was used.
export const authStorage = {
    setItem(key, value, remember) {
        (remember ? localStorage : sessionStorage).setItem(key, value);
    },
    getItem(key) {
        return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    },
    removeItem(key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    },
    // Whichever storage the current session actually lives in -- so an
    // in-session update (e.g. after changing your password) writes back
    // to the same place it came from, instead of always defaulting to
    // one or the other and silently switching a "don't remember me"
    // session into a persistent one.
    isRemembered() {
        return localStorage.getItem('pm_token') != null;
    },
};

const api = axios.create({
    baseURL: `${BASE}/api/v1/merchant`,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = authStorage.getItem('pm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let redirecting = false;
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && !redirecting) {
            redirecting = true;
            authStorage.removeItem('pm_token');
            authStorage.removeItem('pm_user');
            window.location.href = '/login?timeout=1';
        }
        return Promise.reject(err);
    }
);

// Login/signup live outside the /merchant prefix (see MerchantOnboardingController)
// -- a separate, unauthenticated client for those two calls specifically.
const portalApi = axios.create({
    baseURL: `${BASE}/api/v1/merchant-portal`,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Public, read-only: countries and currencies Payport serves.
export const marketsApi = { list: () => axios.get(`${BASE}/api/v1/markets`) };

export const authApi = {
    login: (email, password) => portalApi.post('/login', { email, password }),
    signup: (application) => portalApi.post('/signup', application),
    forgotPassword: (email) => portalApi.post('/forgot-password', { email }),
    resetPassword: (token, newPassword) => portalApi.post('/reset-password', { token, newPassword }),
};

/** The server's own message for a failed call (message: the specific reason, e.g. the first invalid field; error.message as fallback). */
export function errorMessage(err, fallback) {
    const d = err?.response?.data;
    return d?.message || d?.error?.message || fallback;
}

export const checkoutSessionsApi = {
    list: (status) => api.get('/checkout-sessions', { params: status ? { status } : {} }),
    get: (id) => api.get(`/checkout-sessions/${id}`),
    getByReference: (reference) => api.get(`/checkout-sessions/by-reference/${encodeURIComponent(reference)}`),
    cancel: (id) => api.post(`/checkout-sessions/${id}/cancel`),
    create: (body) => api.post('/checkout-sessions', body),
};

export const balanceApi = {
    get: () => api.get('/balance'),
    // Four buckets per currency: pending (hold), available, in settlement, paid out.
    balances: (mode = 'live') => api.get('/balances', { params: { mode } }),
    statement: (currency, from, to, mode = 'live') => api.get('/statement', { params: { currency, from, to, mode } }),
    payouts: () => api.get('/payouts'),
};

export const reportsApi = {
    collectionsByMethod: () => api.get('/collections-by-method'),
    trends: (days = 30, currency) => api.get('/reports/trends', { params: { days, ...(currency ? { currency } : {}) } }),
};

export const codesApi = {
    list: () => api.get('/codes'),
    request: (label, address) => api.post('/codes/requests', { label, address }),
    newQr: (code) => api.post(`/codes/${code}/qr`),
    report: ({ code, from, to }) => api.get('/codes/report', { params: { ...(code ? { code } : {}), from, to } }),
};

export const teamApi = {
    list: () => api.get('/team'),
    invite: (fullName, email, role) => api.post('/team', { fullName, email, role }),
    deactivate: (id) => api.post(`/team/${id}/deactivate`),
    reactivate: (id) => api.post(`/team/${id}/reactivate`),
    resetPassword: (id) => api.post(`/team/${id}/reset-password`),
    changePassword: (currentPassword, newPassword) => api.post('/team/change-password', { currentPassword, newPassword }),
};

export const apiKeysApi = {
    list: () => api.get('/api-keys'),
    create: (environment, label, scopes, expiresAt) => api.post('/api-keys', { environment, label, scopes, expiresAt: expiresAt || null }),
    rotate: (id, overlapHours = 24) => api.post(`/api-keys/${id}/rotate`, null, { params: { overlapHours } }),
    revoke: (id) => api.post(`/api-keys/${id}/revoke`),
};

export const webhooksApi = {
    list: () => api.get('/webhooks'),
    register: (url) => api.post('/webhooks', { url }),
    deliveries: (webhookId) => api.get(`/webhooks/${webhookId}/deliveries`),
    test: (id) => api.post(`/webhooks/${id}/test`),
    replay: (deliveryId) => api.post(`/webhooks/deliveries/${deliveryId}/replay`),
    rotateSecret: (id) => api.post(`/webhooks/${id}/rotate-secret`),
    disable: (id) => api.post(`/webhooks/${id}/disable`),
};

export const refundsApi = {
    list: (sessionId) => api.get(`/checkout-sessions/${sessionId}/refunds`),
    create: (sessionId, amountCents, reason) => api.post(`/checkout-sessions/${sessionId}/refunds`, { amountCents, reason }),
};

export const disputesApi = {
    list: (sessionId) => api.get(`/checkout-sessions/${sessionId}/disputes`),
};

export const queriesApi = {
    listAll: () => api.get('/queries'),
    listForSession: (sessionId) => api.get(`/queries/by-session/${sessionId}`),
    getByReference: (referenceNumber) => api.get(`/queries/by-reference/${encodeURIComponent(referenceNumber)}`),
    raise: (checkoutSessionId, subject, message) => api.post('/queries', { checkoutSessionId, subject, message }),
    reopen: (id, message) => api.post(`/queries/${id}/reopen`, { message }),
    addMessage: (id, message) => api.post(`/queries/${id}/messages`, { message }),
    listMessages: (id) => api.get(`/queries/${id}/messages`),
    uploadAttachment: (queryId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/queries/${queryId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    listAttachments: (queryId) => api.get(`/queries/${queryId}/attachments`),
    downloadAttachment: (queryId, attachmentId) => api.get(`/queries/${queryId}/attachments/${attachmentId}/download`, { responseType: 'blob' }),
};

export const paymentLinksApi = {
    list: () => api.get('/payment-links'),
    create: (amountCents, currency, description, reusable) => api.post('/payment-links', { amountCents, currency, description, reusable }),
    disable: (id) => api.post(`/payment-links/${id}/disable`),
};

export const settlementsApi = {
    list: () => api.get('/settlements'),
};

export const platformApi = {
    readiness: () => api.get('/readiness'),
    destinations: () => api.get('/settlement-destinations'),
    addDestination: (body) => api.post('/settlement-destinations', body),
};

// The payment methods this business accepts (everywhere: store, links, hosted checkout).
export const paymentMethodsApi = {
    list: () => api.get('/payment-methods'),
    set: (changes) => api.put('/payment-methods', changes),
};

// POS terminals (switched on by Payport).
export const posApi = {
    terminals: () => api.get('/pos/terminals'),
    register: (label) => api.post('/pos/terminals', { label }),
    setStatus: (terminalId, active, reason) => api.post(`/pos/terminals/${encodeURIComponent(terminalId)}/status`, { active, reason }),
    sales: () => api.get('/pos/sales'),
};

export const API_KEY_SCOPES = ['checkout:read', 'checkout:write', 'refunds:write', 'disputes:read', 'disputes:write',
    'payment_links:write', 'balances:read', 'payouts:read', 'webhooks:manage'];

export const applicationApi = {
    getStatus: () => api.get('/application'),
    resolveNote: (id) => api.post(`/application/review-notes/${id}/resolve`),
};

// Document types the gateway accepts for an application.
export const DOC_TYPES = [
    { value: 'CERTIFICATE_OF_INCORPORATION', label: 'Certificate of incorporation / business registration' },
    { value: 'DIRECTOR_ID', label: "Director's ID or passport" },
    { value: 'PROOF_OF_ADDRESS', label: 'Proof of business address' },
    { value: 'TAX_CLEARANCE', label: 'Tax clearance certificate' },
    { value: 'BANK_CONFIRMATION', label: 'Bank account confirmation letter' },
    { value: 'OTHER', label: 'Other supporting document' },
];

// Public status of an application by its reference (no login).
export const trackApi = { status: (reference) => portalApi.get(`/track/${encodeURIComponent(reference.trim().toUpperCase())}`) };

/** Uploads one application document with a given login token (used right after signing up). */
export function uploadDocumentWithToken(token, documentType, file) {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);
    return axios.post(`${BASE}/api/v1/merchant/documents`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
}

export const documentsApi = {
    list: () => api.get('/documents'),
    upload: (documentType, file) => {
        const formData = new FormData();
        formData.append('documentType', documentType);
        formData.append('file', file);
        return api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
};

export function formatAmount(cents, currency = 'USD') {
    const value = (cents ?? 0) / 100;
    const symbol = currency === 'ZWG' ? 'ZWG ' : '$';
    return `${symbol}${value.toFixed(2)}`;
}

export const METHOD_LABELS = {
    ECOCASH: 'EcoCash',
    ONEMONEY: 'OneMoney',
    OMARI: 'Omari',
    ZIMSWITCH: 'Card (ZimSwitch)',
};

export function isLoggedIn() {
    return !!authStorage.getItem('pm_token');
}

export function getCurrentUser() {
    try {
        return JSON.parse(authStorage.getItem('pm_user') || 'null');
    } catch {
        return null;
    }
}
