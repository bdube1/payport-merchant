import axios from 'axios';
import { authStorage } from './api';

// PayPort Commerce is its own service (store.payport.africa), so it keeps working when PayPort Payments is down.
// The portal signs in to it once with the portal's own login; Commerce gives a 12-hour store session.
const BASE = import.meta.env.VITE_COMMERCE_URL || 'https://store.payport.africa';
export const STORE_BASE = BASE;

const commerceHttp = axios.create({ baseURL: `${BASE}/api/commerce`, timeout: 30000, headers: { 'Content-Type': 'application/json' } });

let session = null;
async function signIn() {
    if (!session) {
        session = commerceHttp.post('/session', { portalToken: authStorage.getItem('pm_token') })
            .then(r => {
                const d = r.data.data;
                authStorage.setItem('pm_store', JSON.stringify(d), authStorage.isRemembered());
                return d;
            })
            .finally(() => { session = null; });
    }
    return session;
}

export function storeSession() {
    try { return JSON.parse(authStorage.getItem('pm_store') || 'null'); } catch { return null; }
}

commerceHttp.interceptors.request.use(async (config) => {
    if (config.url === '/session') return config;
    let s = storeSession();
    if (!s?.token) s = await signIn();
    config.headers.Authorization = `Bearer ${s.token}`;
    return config;
});

commerceHttp.interceptors.response.use((res) => res, async (err) => {
    const d = err?.response?.data;
    // Same reading of errors as the rest of the portal: the server's own message.
    if (d && !d.message && d.error?.message) d.message = d.error.message;
    const cfg = err.config || {};
    if (err.response?.status === 401 && cfg.url !== '/session' && !cfg._again) {
        authStorage.removeItem('pm_store');
        await signIn();
        return commerceHttp({ ...cfg, _again: true });
    }
    return Promise.reject(err);
});

export const storeApi = {
    connect: () => signIn(),
    overview: () => commerceHttp.get('/overview'),
    store: () => commerceHttp.get('/store'),
    saveStore: (b) => commerceHttp.put('/store', b),
    upload: (file) => {
        const f = new FormData();
        f.append('file', file);
        return commerceHttp.post('/images', f, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    products: () => commerceHttp.get('/products'),
    createProduct: (b) => commerceHttp.post('/products', b),
    saveProduct: (id, b) => commerceHttp.put(`/products/${id}`, b),
    links: () => commerceHttp.get('/links'),
    createLink: (b) => commerceHttp.post('/links', b),
    setLink: (id, active) => commerceHttp.post(`/links/${id}/status`, { active }),
    orders: (payment, q) => commerceHttp.get('/orders', { params: { payment: payment || undefined, q: q || undefined } }),
    order: (ref) => commerceHttp.get(`/orders/${encodeURIComponent(ref)}`),
    orderStatus: (ref, status) => commerceHttp.post(`/orders/${encodeURIComponent(ref)}/status`, { status }),
    refund: (ref, amountMinor, reason) => commerceHttp.post(`/orders/${encodeURIComponent(ref)}/refunds`, { amountMinor, reason }),
    delivery: (ref, status) => commerceHttp.post(`/orders/${encodeURIComponent(ref)}/delivery`, { status }),
    domains: () => commerceHttp.get('/domains'),
    addDomain: (domain) => commerceHttp.post('/domains', { domain }),
    verifyDomain: (id) => commerceHttp.post(`/domains/${id}/verify`),
    removeDomain: (id) => commerceHttp.delete(`/domains/${id}`),
    insights: () => commerceHttp.get('/insights'),
    customers: (q) => commerceHttp.get('/customers', { params: { q: q || undefined } }),
};

export const imageUrl = (id) => (id ? `${BASE}/img/${id}` : null);
