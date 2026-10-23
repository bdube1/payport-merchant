import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'pp_theme';

/** Applies the saved theme (or the device's preference) before the first paint. */
export function initTheme() {
    let t = null;
    try { t = localStorage.getItem(KEY); } catch { /* storage blocked */ }
    if (t !== 'dark' && t !== 'light') t = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
}

export function useTheme() {
    const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
        setTheme(next);
    };
    return { theme, dark: theme === 'dark', toggle };
}

/** Light/dark switch. variant "sidebar" sits on the navy sidebar; "page" on the page background. */
export function ThemeToggle({ variant = 'page', style }) {
    const { dark, toggle } = useTheme();
    const Icon = dark ? Sun : Moon;
    const base = variant === 'sidebar'
        ? { color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }
        : { color: 'var(--text-2)', background: 'var(--bg-card)', border: '1px solid var(--border)' };
    return (
        <button type="button" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...base, ...style }}>
            <Icon size={15} /> {dark ? 'Light mode' : 'Dark mode'}
        </button>
    );
}
