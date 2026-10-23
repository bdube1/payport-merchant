import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, errorMessage } from '../lib/api';
import { ThemeToggle } from '../lib/theme.jsx';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            await authApi.forgotPassword(email.trim());
            setSent(true);
        } catch (err) {
            setError(errorMessage(err, 'Could not send the reset link. Please try again.'));
        } finally { setBusy(false); }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20, position: 'relative' }}>
            <ThemeToggle style={{ position: 'absolute', top: 16, right: 16 }} />
            <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 380, padding: 36 }}>
                <h1 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>Forgot your password?</h1>
                {sent ? (
                    <>
                        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                            If <strong>{email}</strong> has a merchant login, a link to choose a new password is on its way. The link works for one hour.
                        </p>
                        <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 12, textDecoration: 'none' }}>Back to sign in</Link>
                    </>
                ) : (
                    <>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 20px' }}>Enter the email you sign in with and we will email you a reset link.</p>
                        {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 20 }} />
                        <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                            {busy ? 'Sending…' : 'Send reset link'}
                        </button>
                        <p style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}><Link to="/login">Back to sign in</Link></p>
                    </>
                )}
            </form>
        </div>
    );
}
