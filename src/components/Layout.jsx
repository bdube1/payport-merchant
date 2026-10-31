import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutDashboard, Receipt, Key, Webhook, LogOut, PieChart, Users, Link2, KeyRound, Landmark, MessageCircleQuestion, Wallet, Rocket, MonitorSmartphone, QrCode, Store } from 'lucide-react';
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
    useEffect(() => { if (inStore) setStoreOpen(true); }, [inStore]);
    useEffect(() => {
        const check = () => storeApi.chats().then(r => setUnread(r?.data?.data?.unread || 0)).catch(() => {});
        check();
        const t = setInterval(check, 60000);
        return () => clearInterval(t);
    }, []);
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

            <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
        </div>
    );
}
