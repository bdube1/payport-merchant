import Agent from './pages/Agent';
import Pos from './pages/Pos';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import ApplicationStatus from './pages/ApplicationStatus.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Queries from './pages/Queries.jsx';
import Reports from './pages/Reports.jsx';
import PaymentLinks from './pages/PaymentLinks.jsx';
import Settlements from './pages/Settlements.jsx';
import Webhooks from './pages/Webhooks.jsx';
import Team from './pages/Team.jsx';
import Developers from './pages/Developers.jsx';
import GoLive from './pages/GoLive.jsx';
import Balances from './pages/Balances.jsx';
import Payouts from './pages/Payouts.jsx';

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
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/change-password" element={<RequireChangePasswordAuth />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/transactions" element={<RequireAuth><Transactions /></RequireAuth>} />
            <Route path="/queries" element={<RequireAuth><Queries /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/payment-links" element={<RequireAuth><PaymentLinks /></RequireAuth>} />
            <Route path="/settlements" element={<RequireAuth><Settlements /></RequireAuth>} />
            <Route path="/api-keys" element={<RequireAuth><Developers /></RequireAuth>} />
            <Route path="/go-live" element={<RequireAuth><GoLive /></RequireAuth>} />
            <Route path="/balances" element={<RequireAuth><Balances /></RequireAuth>} />
            <Route path="/payouts" element={<RequireAuth><Payouts /></RequireAuth>} />
            <Route path="/webhooks" element={<RequireAuth><Webhooks /></RequireAuth>} />
            <Route path="/team" element={<RequireAuth><Team /></RequireAuth>} />
            <Route path="/agent" element={<RequireAuth><Agent /></RequireAuth>} />
            <Route path="/pos" element={<RequireAuth><Pos /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-right" />
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
