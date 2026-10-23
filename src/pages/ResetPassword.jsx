import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, errorMessage } from '../lib/api';
import { ThemeToggle } from '../lib/theme.jsx';

export default function ResetPassword() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError("The passwords don't match"); return; }
        setBusy(true);
        try {
            await authApi.resetPassword(token, password);
            setDone(true);
            setTimeout(() => navigate('/login', { replace: true }), 1800);
        } catch (err) {
            setError(errorMessage(err, 'This reset link is invalid or has expired.'));
        } finally { setBusy(false); }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20, position: 'relative' }}>
            <ThemeToggle style={{ position: 'absolute', top: 16, right: 16 }} />
            <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 380, padding: 36 }}>
                <h1 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>Choose a new password</h1>
                {!token ? (
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>This link is incomplete. <Link to="/forgot-password">Ask for a new one</Link>.</p>
                ) : done ? (
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Your password has been changed. Taking you to sign in…</p>
                ) : (
                    <>
                        {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, margin: '12px 0 16px' }}>{error}</div>}
                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', margin: '14px 0 6px' }}>New password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
                        <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: '0 0 14px' }}>At least 8 characters, with uppercase, lowercase, a digit and a special character.</p>
                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Confirm new password</label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: '100%', marginBottom: 20 }} />
                        <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                            {busy ? 'Saving…' : 'Set new password'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
