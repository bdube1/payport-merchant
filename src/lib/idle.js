// Inactivity time-out (owner, 2026-10-25): after the minutes set in ops (Platform Setup → Session Timeouts) without
// any activity, the person is signed out and taken to the login page. Activity in any tab of this portal counts,
// and a page reopened after the time has passed signs out at once.
import { useEffect, useRef } from 'react';
import { API_BASE } from './apiBase';

const BASE = API_BASE;
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
let settings = null;

/** Minutes for this portal, read once from the gateway (falls back when it cannot be read). */
export function timeoutMinutes(portal, fallback) {
    if (!settings) {
        settings = fetch(`${BASE}/api/v1/session-timeouts`).then(r => r.json()).then(j => j?.data || {}).catch(() => { settings = null; return {}; });
    }
    return settings.then(m => Number(m[portal]) || fallback);
}

const sig = (token) => String(token || '').slice(-16);

export function useIdleLogout(token, portal, onTimeout, fallback = 15) {
    const cb = useRef(onTimeout);
    cb.current = onTimeout;
    useEffect(() => {
        if (!token) return undefined;
        const key = `pp_idle_${portal}`;
        const read = () => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
        const write = (t) => { try { localStorage.setItem(key, JSON.stringify({ s: sig(token), t })); } catch { /* storage blocked */ } };
        let minutes = fallback;
        let lastWrite = 0;
        let done = false;
        // A new sign-in starts a fresh clock; a reload of the same session keeps it.
        const prev = read();
        if (!prev || prev.s !== sig(token)) write(Date.now());
        const touch = () => {
            const now = Date.now();
            if (now - lastWrite > 5000) { lastWrite = now; write(now); }
        };
        const check = () => {
            if (done) return;
            const cur = read();
            const last = cur && cur.s === sig(token) ? cur.t : Date.now();
            if (Date.now() - last >= minutes * 60000) {
                done = true;
                try { localStorage.removeItem(key); } catch { /* none */ }
                cb.current?.();
            }
        };
        timeoutMinutes(portal, fallback).then(m => { minutes = m; check(); });
        EVENTS.forEach(e => window.addEventListener(e, touch, { passive: true }));
        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);
        const timer = setInterval(check, 10000);
        return () => {
            EVENTS.forEach(e => window.removeEventListener(e, touch));
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(timer);
        };
    }, [token, portal, fallback]);
}
