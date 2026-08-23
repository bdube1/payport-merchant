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
            window.location.href = '/login';
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

export const authApi = {
    login: (email, password) => portalApi.post('/login', { email, password }),
};

export const checkoutSessionsApi = {
    list: (status) => api.get('/checkout-sessions', { params: status ? { status } : {} }),
    get: (id) => api.get(`/checkout-sessions/${id}`),
    getByReference: (reference) => api.get(`/checkout-sessions/by-reference/${encodeURIComponent(reference)}`),
    cancel: (id) => api.post(`/checkout-sessions/${id}/cancel`),
};

export const balanceApi = {
    get: () => api.get('/balance'),
};

export const reportsApi = {
    collectionsByMethod: () => api.get('/collections-by-method'),
    trends: (days = 30, currency) => api.get('/reports/trends', { params: { days, ...(currency ? { currency } : {}) } }),
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
};

export const webhooksApi = {
    list: () => api.get('/webhooks'),
    register: (url) => api.post('/webhooks', { url }),
    deliveries: (webhookId) => api.get(`/webhooks/${webhookId}/deliveries`),
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
};

export const paymentLinksApi = {
    list: () => api.get('/payment-links'),
    create: (amountCents, currency, description, reusable) => api.post('/payment-links', { amountCents, currency, description, reusable }),
    disable: (id) => api.post(`/payment-links/${id}/disable`),
};

export const settlementsApi = {
    list: () => api.get('/settlements'),
};

export const applicationApi = {
    getStatus: () => api.get('/application'),
    resolveNote: (id) => api.post(`/application/review-notes/${id}/resolve`),
};

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
