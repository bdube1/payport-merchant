import { useIdleLogout } from '../lib/idle';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowDownUp, Landmark, Receipt, Percent, LogOut, KeyRound, QrCode } from 'lucide-react';
import { agentSession } from './agentApi';
import { AgentAuthProvider, useAgentAuth } from './agentAuth.jsx';
import { ThemeToggle } from '../lib/theme.jsx';
import { AgentLogin, AgentForgotPassword, AgentResetPassword, AgentApply, AgentTrack, AgentChangePassword } from './AgentPublic.jsx';
import { AgentDashboard, AgentServe, AgentFloat, AgentTransactions, AgentCommissions, AgentCodes } from './AgentPages.jsx';

const nav = [
    { to: '/agent', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/agent/serve', icon: ArrowDownUp, label: 'Cash in & cash out' },
    { to: '/agent/float', icon: Landmark, label: 'Float' },
    { to: '/agent/transactions', icon: Receipt, label: 'Transactions' },
    { to: '/agent/commissions', icon: Percent, label: 'Commissions' },
    { to: '/agent/codes', icon: QrCode, label: 'Codes & QR' },
];

function AgentLayout({ children }) {
    const { user, logout } = useAgentAuth();
    const navigate = useNavigate();
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside style={{ width: 240, background: 'var(--navy)', color: 'white', display: 'flex', flexDirection: 'column', padding: '24px 16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 32 }}>
                    <img src="/favicon.png" alt="" style={{ width: 26, height: 26, borderRadius: 6 }} />
                    <span style={{ fontWeight: 800, fontSize: 16 }}>Payport Agent</span>
                </div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {nav.map(({ to, icon: Icon, label, end }) => (
                        <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                            color: isActive ? 'white' : 'rgba(255,255,255,0.65)', background: isActive ? 'rgba(6,163,218,0.18)' : 'transparent',
                            fontSize: 13.5, fontWeight: 600,
                        })}>
                            <Icon size={17} /> {label}
                        </NavLink>
                    ))}
                </nav>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 16 }}>
                    <div style={{ padding: '0 8px', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.agentName}</div>
                        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{user?.agentCode} · {user?.fullName}</div>
                    </div>
                    <ThemeToggle variant="sidebar" style={{ width: '100%', marginBottom: 6 }} />
                    <NavLink to="/agent/change-password" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 6 }}>
                        <KeyRound size={15} /> Change password
                    </NavLink>
                    <button onClick={() => { logout(); navigate('/agent/login', { replace: true }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'rgba(229,62,62,0.15)', color: '#ff9b9b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        <LogOut size={15} /> Sign out
                    </button>
                </div>
            </aside>
            <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
        </div>
    );
}

function RequireAgent({ children }) {
    const { user, logout } = useAgentAuth();
    // Signed out after the agent time-out without activity (set in ops).
    useIdleLogout(user ? agentSession.token() : null, 'agent', () => {
        logout();
        window.location.href = '/agent/login?timeout=1';
    });
    if (!user || !agentSession.token()) return <Navigate to="/agent/login" replace />;
    if (user.mustChangePassword) return <Navigate to="/agent/change-password" replace />;
    return <AgentLayout>{children}</AgentLayout>;
}

export default function AgentApp() {
    return (
        <AgentAuthProvider>
            <Routes>
                <Route path="login" element={<AgentLogin />} />
                <Route path="forgot-password" element={<AgentForgotPassword />} />
                <Route path="reset-password" element={<AgentResetPassword />} />
                <Route path="apply" element={<AgentApply />} />
                <Route path="track" element={<AgentTrack />} />
                <Route path="change-password" element={<AgentChangePassword />} />
                <Route index element={<RequireAgent><AgentDashboard /></RequireAgent>} />
                <Route path="serve" element={<RequireAgent><AgentServe /></RequireAgent>} />
                <Route path="float" element={<RequireAgent><AgentFloat /></RequireAgent>} />
                <Route path="transactions" element={<RequireAgent><AgentTransactions /></RequireAgent>} />
                <Route path="commissions" element={<RequireAgent><AgentCommissions /></RequireAgent>} />
                <Route path="codes" element={<RequireAgent><AgentCodes /></RequireAgent>} />
                <Route path="*" element={<Navigate to="/agent" replace />} />
            </Routes>
        </AgentAuthProvider>
    );
}
