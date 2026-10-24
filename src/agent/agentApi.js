import axios from 'axios';

// The agent portal: its own login and token, separate from the merchant dashboard.
const BASE = import.meta.env.VITE_API_URL || 'https://api.payport.africa';

export const agentSession = {
    token: () => { try { return localStorage.getItem('pa_token'); } catch { return null; } },
    user: () => { try { return JSON.parse(localStorage.getItem('pa_user')); } catch { return null; } },
    save: (token, user) => {
        try {
            if (token) localStorage.setItem('pa_token', token);
            localStorage.setItem('pa_user', JSON.stringify(user));
        } catch { /* storage blocked */ }
    },
    clear: () => { try { localStorage.removeItem('pa_token'); localStorage.removeItem('pa_user'); } catch { /* storage blocked */ } },
};

const agentPortalHttp = axios.create({ baseURL: `${BASE}/api/v1/agent-portal`, timeout: 30000, headers: { 'Content-Type': 'application/json' } });
const agentHttp = axios.create({ baseURL: `${BASE}/api/v1/agent`, timeout: 30000, headers: { 'Content-Type': 'application/json' } });

agentHttp.interceptors.request.use((config) => {
    const t = agentSession.token();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
});
agentHttp.interceptors.response.use((r) => r, (err) => {
    const s = err.response?.status;
    const code = err.response?.data?.error?.code;
    if (s === 401) {
        agentSession.clear();
        if (!window.location.pathname.startsWith('/agent/login')) window.location.href = '/agent/login';
    } else if (s === 403 && code === 'MUST_CHANGE_PASSWORD' && !window.location.pathname.startsWith('/agent/change-password')) {
        window.location.href = '/agent/change-password';
    }
    return Promise.reject(err);
});

export const agentPortalApi = {
    login: (email, password) => agentPortalHttp.post('/login', { email, password }),
    forgotPassword: (email) => agentPortalHttp.post('/forgot-password', { email }),
    resetPassword: (token, newPassword) => agentPortalHttp.post('/reset-password', { token, newPassword }),
    apply: (application) => agentPortalHttp.post('/apply', application),
    track: (reference) => agentPortalHttp.get(`/track/${encodeURIComponent(reference.trim().toUpperCase())}`),
};

export const agentApi = {
    me: () => agentHttp.get('/me'),
    changePassword: (currentPassword, newPassword) => agentHttp.post('/change-password', { currentPassword, newPassword }),
    dashboard: () => agentHttp.get('/dashboard'),
    customer: (customer, currency) => agentHttp.get('/customer', { params: { customer, currency } }),
    deposits: () => agentHttp.get('/float-deposits'),
    notifyDeposit: (amountMinor, currency, bankReference) => agentHttp.post('/float-deposits', { amountMinor, currency, bankReference }),
    cashIn: (customer, currency, amountMinor, clientRef) => agentHttp.post('/cash-in', { customer, currency, amountMinor, clientRef }),
    transactions: () => agentHttp.get('/transactions'),
    commissions: () => agentHttp.get('/commissions'),
};

export const errorMessage = (err, fallback) => err?.response?.data?.message || err?.response?.data?.error?.message || fallback;
