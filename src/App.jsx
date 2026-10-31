import { useIdleLogout } from './lib/idle';
import { authStorage } from './lib/api';
import { lazy, Suspense } from 'react';
const Pos = lazy(() => import('./pages/Pos'));
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
const Signup = lazy(() => import('./pages/Signup.jsx'));
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'));
const ApplicationStatus = lazy(() => import('./pages/ApplicationStatus.jsx'));
const Track = lazy(() => import('./pages/Track.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const AgentApp = lazy(() => import('./agent/AgentApp.jsx'));
const Codes = lazy(() => import('./pages/Codes'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Queries = lazy(() => import('./pages/Queries.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const PaymentLinks = lazy(() => import('./pages/PaymentLinks.jsx'));
const Settlements = lazy(() => import('./pages/Settlements.jsx'));
const Webhooks = lazy(() => import('./pages/Webhooks.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Developers = lazy(() => import('./pages/Developers.jsx'));
const GoLive = lazy(() => import('./pages/GoLive.jsx'));
const Balances = lazy(() => import('./pages/Balances.jsx'));
const Payouts = lazy(() => import('./pages/Payouts.jsx'));
const Store = lazy(() => import('./pages/Store.jsx'));

function RequireAuth({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    // A team member logging in with a temporary password (see Team.jsx)
    // must set a real one before touching anything else.
    if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
    // A merchant whose application isn't ACTIVE yet gets the status
    // tracker instead of the real dashboard -- there's nothing real to
    // show them (no transactions, no API keys) until they're approved.
    if (user.merchantStatus && user.merchantStatus !== 'ACTIVE') return <ApplicationStatus />;
    return <Layout>{children}</Layout>;
}

function RequireChangePasswordAuth() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <ChangePassword />;
}

function AppRoutes() {
    return (
        <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>}><Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/track" element={<Track />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/agent/*" element={<AgentApp />} />
            <Route path="/change-password" element={<RequireChangePasswordAuth />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/transactions" element={<RequireAuth><Transactions /></RequireAuth>} />
            <Route path="/queries" element={<RequireAuth><Queries /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/store" element={<RequireAuth><Store /></RequireAuth>} />
            <Route path="/store/:section" element={<RequireAuth><Store /></RequireAuth>} />
            <Route path="/payment-links" element={<RequireAuth><PaymentLinks /></RequireAuth>} />
            <Route path="/settlements" element={<RequireAuth><Settlements /></RequireAuth>} />
            <Route path="/api-keys" element={<RequireAuth><Developers /></RequireAuth>} />
            <Route path="/go-live" element={<RequireAuth><GoLive /></RequireAuth>} />
            <Route path="/balances" element={<RequireAuth><Balances /></RequireAuth>} />
            <Route path="/payouts" element={<RequireAuth><Payouts /></RequireAuth>} />
            <Route path="/webhooks" element={<RequireAuth><Webhooks /></RequireAuth>} />
            <Route path="/team" element={<RequireAuth><Team /></RequireAuth>} />
            <Route path="/pos" element={<RequireAuth><Pos /></RequireAuth>} />
            <Route path="/codes" element={<RequireAuth><Codes /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
    );
}

/** Signs a merchant user out after the merchant time-out without activity (the agent portal has its own). */
function IdleGuard() {
    const { user, logout } = useAuth();
    const agentArea = window.location.pathname.startsWith('/agent');
    useIdleLogout(user && !agentArea ? authStorage.getItem('pm_token') : null, 'merchant', () => {
        logout();
        window.location.href = '/login?timeout=1';
    });
    return null;
}

export default function App() {
    return (
        <AuthProvider>
            <IdleGuard />
            <BrowserRouter>
                <Toaster position="top-right" />
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
