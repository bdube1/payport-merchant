import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { ThemeToggle } from '../lib/theme.jsx';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState(() => (new URLSearchParams(window.location.search).get('timeout') ? 'Your session timed out. Please sign in again.' : ''));
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password, rememberMe);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20, position: 'relative' }}>
            <ThemeToggle style={{ position: 'absolute', top: 16, right: 16 }} />
            <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 380, padding: 36 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <img src="/favicon.png" alt="" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 12 }} />
                    <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Merchant Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>Sign in to your Payport merchant account</p>
                </div>

                {!error && new URLSearchParams(window.location.search).get('changed') && (
                    <div style={{ background: 'var(--badge-green)', color: 'var(--green)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18 }}>
                        Password changed. Sign in with your new password.
                    </div>
                )}
                {error && (
                    <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18 }}>
                        {error}
                    </div>
                )}

                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Email</label>
                <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required style={{ width: '100%', marginBottom: 16 }}
                />

                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Password</label>
                <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required style={{ width: '100%', marginBottom: 16 }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, gap: 10 }}>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 'auto' }} />
                        Remember me
                    </label>
                    <Link to="/forgot-password" style={{ fontSize: 13 }}>Forgot password?</Link>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>

                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 20 }}>
                    New to Payport? <Link to="/signup">Apply for a merchant account</Link> · <Link to="/track">Track an application</Link>
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 8 }}>
                    Payport agent? <Link to="/agent/login">Sign in to the agent portal</Link>
                </p>
            </form>
        </div>
    );
}
