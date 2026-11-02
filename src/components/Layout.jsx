import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ChevronRight, LayoutDashboard, Receipt, Key, Webhook, LogOut, PieChart, Users, Link2, KeyRound, Landmark, MessageCircleQuestion, Wallet, Rocket, MonitorSmartphone, QrCode, Store, Nfc } from 'lucide-react';
import { ThemeToggle } from '../lib/theme.jsx';
import { useAuth } from '../lib/auth.jsx';
import { storeApi } from '../lib/commerce';

// The Store menu: everything about the store, each with its own page (pages/Store.jsx STORE_SECTIONS).
const STORE_MENU = [
    ['/store', 'Dashboard'], ['/store/products', 'Products'], ['/store/collections', 'Collections'], ['/store/discounts', 'Discounts'],
    ['/store/orders', 'Orders'], ['/store/bookings', 'Bookings'], ['/store/customers', 'Customers'], ['/store/chats', 'Chats'],
    ['/store/reviews', 'Reviews and ratings'], ['/store/reports', 'Reports'], ['/store/offers', 'Offers'], ['/store/links', 'Payment links'],
    ['/store/settings', 'Settings'],
];

// API Keys/Webhooks require OWNER or DEVELOPER (matches the backend's
// @PreAuthorize exactly -- this hides the nav item for a better FINANCE
// experience, but the server-side check is what actually enforces it).
const nav = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true, roles: null },
    { to: '/transactions', icon: Receipt, label: 'Transactions', roles: null },
    { to: '/store', icon: Store, label: 'Store', roles: null },
    { to: '/queries', icon: MessageCircleQuestion, label: 'Queries', roles: null },
    { to: '/payment-links', icon: Link2, label: 'Payment Links', roles: ['OWNER', 'DEVELOPER'] },
    { to: '/balances', icon: Wallet, label: 'Balances', roles: null },
    { to: '/payouts', icon: Landmark, label: 'Payouts', roles: null },
    { to: '/go-live', icon: Rocket, label: 'Go-live', roles: ['OWNER', 'DEVELOPER'] },
    { to: '/tap', icon: Nfc, label: 'Tap to get paid', roles: null },
    { to: '/codes', icon: QrCode, label: 'Codes & QR', roles: null },
    { to: '/reports', icon: PieChart, label: 'Reports', roles: null },
    { to: '/api-keys', icon: Key, label: 'API Keys', roles: ['OWNER', 'DEVELOPER'] },
    { to: '/webhooks', icon: Webhook, label: 'Webhooks', roles: ['OWNER', 'DEVELOPER'] },
    { to: '/pos', icon: MonitorSmartphone, label: 'POS terminals', roles: ['OWNER', 'DEVELOPER'] },
    { to: '/team', icon: Users, label: 'Team', roles: ['OWNER'] },
];

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const visibleNav = nav.filter(item => !item.roles || item.roles.includes(user?.role));
    const { pathname } = useLocation();
    const inStore = pathname === '/store' || pathname.startsWith('/store/');
    const [storeOpen, setStoreOpen] = useState(inStore);
    const [unread, setUnread] = useState(0);
    const [bell, setBell] = useState({ unread: 0, items: [] });
    const [bellOpen, setBellOpen] = useState(false);
    const navigate = useNavigate();
    useEffect(() => { if (inStore) setStoreOpen(true); }, [inStore]);
    useEffect(() => {
        const check = () => {
            storeApi.chats().then(r => setUnread(r?.data?.data?.unread || 0)).catch(() => {});
            storeApi.notifications().then(r => setBell(r?.data?.data || { unread: 0, items: [] })).catch(() => {});
        };
        check();
        const t = setInterval(check, 30000);
        return () => clearInterval(t);
    }, []);
    // a customer calling: a note on every page except the chats (which ring themselves)
    const [calling, setCalling] = useState(null);
    useEffect(() => {
        if (pathname.startsWith('/store/chats')) { setCalling(null); return undefined; }
        const t = setInterval(() => {
            if (document.hidden) return;
            storeApi.incomingCalls().then(r => setCalling(r?.data?.data?.calls?.[0] || null)).catch(() => {});
        }, 5000);
        return () => clearInterval(t);
    }, [pathname]);
    const openBell = () => {
        setBellOpen(o => !o);
        if (!bellOpen) storeApi.notificationsSeen().then(r => setBell(b => ({ ...(r?.data?.data || b), items: b.items }))).catch(() => {});
    };
    const link = (active, sub) => ({
        display: 'flex', alignItems: 'center', gap: 10, padding: sub ? '7px 12px 7px 39px' : '10px 12px', borderRadius: 10, textDecoration: 'none',
        color: active ? 'white' : 'rgba(255,255,255,0.65)', background: active ? 'rgba(6,163,218,0.18)' : 'transparent', fontSize: sub ? 13 : 13.5, fontWeight: 600,
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside style={{ width: 240, flex: 'none', background: 'var(--navy)', color: 'white', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 32 }}>
                    <img src="/favicon.png" alt="" style={{ width: 26, height: 26, borderRadius: 6 }} />
                    <span style={{ fontWeight: 800, fontSize: 16 }}>Payport Merchant</span>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {visibleNav.map(({ to, icon: Icon, label, end }) => to === '/store' ? (
                        <div key={to}>
                            <button type="button" onClick={() => setStoreOpen(o => !o)} style={{ ...link(inStore && !storeOpen, false), width: '100%', border: 0, cursor: 'pointer' }}>
                                <Icon size={17} /> <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                                {unread > 0 && <span style={{ background: '#06A3DA', color: '#fff', borderRadius: 99, fontSize: 11, padding: '1px 7px' }}>{unread}</span>}
                                {storeOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </button>
                            {storeOpen && STORE_MENU.map(([path, name]) => (
                                <NavLink key={path} to={path} end style={({ isActive }) => link(isActive, true)}>
                                    <span style={{ flex: 1 }}>{name}</span>
                                    {path === '/store/chats' && unread > 0 && <span style={{ background: '#06A3DA', color: '#fff', borderRadius: 99, fontSize: 11, padding: '1px 7px' }}>{unread}</span>}
                                </NavLink>
                            ))}
                        </div>
                    ) : (
                        <NavLink key={to} to={to} end={end} style={({ isActive }) => link(isActive, false)}>
                            <Icon size={17} /> {label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 16 }}>
                    <div style={{ padding: '0 8px', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.merchantName}</div>
                        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{user?.fullName} · {user?.role}</div>
                    </div>
                    <ThemeToggle variant="sidebar" style={{ width: '100%', marginBottom: 6 }} />
                    <NavLink
                        to="/change-password"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 6 }}
                    >
                        <KeyRound size={15} /> Change password
                    </NavLink>
                    <button
                        onClick={logout}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'rgba(229,62,62,0.15)', color: '#ff9b9b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                        <LogOut size={15} /> Sign out
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px 0', position: 'relative' }}>
                    <button type="button" aria-label="Notifications" onClick={openBell}
                        style={{ position: 'relative', width: 40, height: 40, borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                        <Bell size={18} />
                        {bell.unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#e53e3e', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{bell.unread}</span>}
                    </button>
                    {bellOpen && (
                        <div className="card" style={{ position: 'absolute', top: 58, right: 24, width: 320, maxHeight: 420, overflowY: 'auto', padding: 8, zIndex: 40 }} onMouseLeave={() => setBellOpen(false)}>
                            {bell.items.length === 0 ? <div style={{ padding: 12, fontSize: 13, color: 'var(--text-2)' }}>Nothing new</div> : bell.items.map((a, i) => (
                                <button key={i} type="button" onClick={() => { setBellOpen(false); navigate(a.link.split('?')[0]); }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 0, borderRadius: 8, background: a.unread ? 'var(--bg-2)' : 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: a.unread ? 700 : 500, cursor: 'pointer', marginBottom: 2 }}>
                                    {a.text}<div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{a.at}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {children}
                {calling && <button type="button" onClick={() => { setCalling(null); navigate('/store/chats'); }}
                    style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 90, background: '#0E2A47', color: '#fff', border: 0, borderRadius: 14, padding: '14px 18px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}>
                    📞 {calling.name || 'A customer'} is calling. Answer</button>}
            </main>
        </div>
    );
}
