import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamApi, authStorage, getCurrentUser } from '../lib/api';

export default function ChangePassword() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const isForced = !!user?.mustChangePassword;
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirm) {
            setError("New passwords don't match");
            return;
        }
        setSubmitting(true);
        try {
            await teamApi.changePassword(currentPassword, newPassword);
            const updated = { ...user, mustChangePassword: false };
            authStorage.setItem('pm_user', JSON.stringify(updated), authStorage.isRemembered());
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Could not change password');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
            <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 380, padding: 36 }}>
                <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{isForced ? 'Set a new password' : 'Change your password'}</h1>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22 }}>
                    {isForced
                        ? "You're using a temporary password. Choose a new one to continue."
                        : 'Enter your current password and choose a new one.'}
                </p>

                {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>{isForced ? 'Current (temporary) password' : 'Current password'}</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={{ width: '100%', marginBottom: 14 }} />

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', marginBottom: 14 }} />
                <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 14 }}>At least 8 characters, with uppercase, lowercase, a digit, and a special character.</p>

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Confirm new password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: '100%', marginBottom: 22 }} />

                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                    {submitting ? 'Saving…' : isForced ? 'Set new password' : 'Change password'}
                </button>

                {!isForced && (
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 10 }}>
                        Cancel
                    </button>
                )}
            </form>
        </div>
    );
}
