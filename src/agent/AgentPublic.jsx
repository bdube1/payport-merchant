import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { agentApi, agentPortalApi, errorMessage } from './agentApi';
import { useAgentAuth } from './agentAuth.jsx';
import { ThemeToggle } from '../lib/theme.jsx';

const STATUS = {
    PENDING: { label: 'Under review', color: 'var(--amber)', text: 'PayPort is reviewing your application.' },
    ACTIVE: { label: 'Approved', color: 'var(--green)', text: 'Your agent account is open. Your sign-in details were sent to your email address.' },
    REJECTED: { label: 'Not approved', color: 'var(--red)', text: 'Your application was not approved. Contact PayPort for details.' },
    SUSPENDED: { label: 'Suspended', color: 'var(--red)', text: 'Your agent account is suspended. Contact PayPort.' },
};

export function Shell({ title, sub, children, width = 400 }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20, position: 'relative' }}>
            <ThemeToggle style={{ position: 'absolute', top: 16, right: 16 }} />
            <div className="card" style={{ width: '100%', maxWidth: width, padding: 36 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <img src="/favicon.png" alt="" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 12 }} />
                    <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{title}</h1>
                    {sub && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>{sub}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

const Err = ({ children }) => children ? <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{children}</div> : null;
const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</label>
        {children}
    </div>
);
const full = { width: '100%' };
const submitBtn = { width: '100%', justifyContent: 'center', padding: 13 };

export function AgentLogin() {
    const { login } = useAgentAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            const u = await login(email.trim(), password);
            navigate(u.mustChangePassword ? '/agent/change-password' : '/agent', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Invalid email or password'));
        } finally { setBusy(false); }
    };
    return (
        <Shell title="Agent Portal" sub="Sign in to your PayPort agent account">
            <form onSubmit={submit}>
                <Err>{error}</Err>
                <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={full} /></Field>
                <Field label="Password"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={full} /></Field>
                <div style={{ textAlign: 'right', marginBottom: 18 }}><Link to="/agent/forgot-password" style={{ fontSize: 13 }}>Forgot password?</Link></div>
                <button type="submit" disabled={busy} className="btn btn-primary" style={submitBtn}>{busy ? 'Signing in…' : 'Sign in'}</button>
                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 20 }}>
                    Want to become an agent? <Link to="/agent/apply">Apply</Link> · <Link to="/agent/track">Track an application</Link>
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 8 }}>
                    Merchant? <Link to="/login">Merchant sign in</Link>
                </p>
            </form>
        </Shell>
    );
}

export function AgentForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setError(''); setBusy(true);
        try { await agentPortalApi.forgotPassword(email.trim()); setSent(true); }
        catch (err) { setError(errorMessage(err, 'Could not send the reset link. Please try again.')); }
        finally { setBusy(false); }
    };
    return (
        <Shell title="Forgot your password?" sub={sent ? null : 'We will email you a link to choose a new one.'}>
            {sent ? (
                <>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>If <strong>{email}</strong> has an agent login, a reset link is on its way. It works for one hour.</p>
                    <Link to="/agent/login" className="btn btn-primary" style={{ ...submitBtn, textDecoration: 'none', marginTop: 12 }}>Back to sign in</Link>
                </>
            ) : (
                <form onSubmit={submit}>
                    <Err>{error}</Err>
                    <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={full} /></Field>
                    <button type="submit" disabled={busy} className="btn btn-primary" style={submitBtn}>{busy ? 'Sending…' : 'Send reset link'}</button>
                    <p style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}><Link to="/agent/login">Back to sign in</Link></p>
                </form>
            )}
        </Shell>
    );
}

export function AgentResetPassword() {
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
            await agentPortalApi.resetPassword(token, password);
            setDone(true);
            setTimeout(() => navigate('/agent/login', { replace: true }), 1800);
        } catch (err) { setError(errorMessage(err, 'This reset link is invalid or has expired.')); }
        finally { setBusy(false); }
    };
    return (
        <Shell title="Choose a new password">
            {!token ? <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>This link is incomplete. <Link to="/agent/forgot-password">Ask for a new one</Link>.</p>
                : done ? <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Your password has been changed. Taking you to sign in…</p>
                : (
                    <form onSubmit={submit}>
                        <Err>{error}</Err>
                        <Field label="New password"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={full} /></Field>
                        <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: '-6px 0 14px' }}>At least 8 characters, with uppercase, lowercase, a digit and a special character.</p>
                        <Field label="Confirm new password"><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={full} /></Field>
                        <button type="submit" disabled={busy} className="btn btn-primary" style={submitBtn}>{busy ? 'Saving…' : 'Set new password'}</button>
                    </form>
                )}
        </Shell>
    );
}

export function AgentChangePassword() {
    const { user, update } = useAgentAuth();
    const navigate = useNavigate();
    const forced = !!user?.mustChangePassword;
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    if (!user) return <Shell title="Change password"><p style={{ fontSize: 13.5 }}><Link to="/agent/login">Sign in first</Link>.</p></Shell>;
    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (next !== confirm) { setError("The new passwords don't match"); return; }
        setBusy(true);
        try {
            await agentApi.changePassword(current, next);
            update({ mustChangePassword: false });
            navigate('/agent', { replace: true });
        } catch (err) { setError(errorMessage(err, 'Could not change the password')); }
        finally { setBusy(false); }
    };
    return (
        <Shell title={forced ? 'Set your own password' : 'Change your password'} sub={forced ? 'You signed in with a temporary password. Choose your own to continue.' : null}>
            <form onSubmit={submit}>
                <Err>{error}</Err>
                <Field label={forced ? 'Temporary password' : 'Current password'}><input type="password" value={current} onChange={e => setCurrent(e.target.value)} required style={full} /></Field>
                <Field label="New password"><input type="password" value={next} onChange={e => setNext(e.target.value)} required style={full} /></Field>
                <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: '-6px 0 14px' }}>At least 8 characters, with uppercase, lowercase, a digit and a special character.</p>
                <Field label="Confirm new password"><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={full} /></Field>
                <button type="submit" disabled={busy} className="btn btn-primary" style={submitBtn}>{busy ? 'Saving…' : 'Save password'}</button>
                {!forced && <button type="button" className="btn btn-ghost" style={{ ...submitBtn, marginTop: 10 }} onClick={() => navigate(-1)}>Cancel</button>}
            </form>
        </Shell>
    );
}

export function AgentApply() {
    const [f, setF] = useState({ name: '', contactPerson: '', phone: '', email: '', idNumber: '', location: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);
    const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            const r = await agentPortalApi.apply(f);
            setDone(r.data?.data || r.data);
        } catch (err) { setError(errorMessage(err, 'We could not submit your application')); }
        finally { setBusy(false); }
    };
    if (done) {
        return (
            <Shell title="Application received">
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 0 }}>Thank you. Your application reference is:</p>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, textAlign: 'center', padding: 14, borderRadius: 12, background: 'var(--bg-2)', margin: '10px 0 16px' }}>{done.applicationReference}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6 }}><strong>Keep this reference.</strong> You need it to check the progress of your application. When you are approved, your sign-in details are emailed to you.</p>
                <Link to={`/agent/track?ref=${encodeURIComponent(done.applicationReference)}`} className="btn btn-primary" style={{ ...submitBtn, textDecoration: 'none', marginTop: 8 }}>Track my application</Link>
            </Shell>
        );
    }
    return (
        <Shell title="Become a PayPort agent" sub="Offer cash-in and cash-out to PayPort customers and earn commission." width={480}>
            <form onSubmit={submit}>
                <Err>{error}</Err>
                <Field label="Business name (as customers will see it)"><input value={f.name} onChange={set('name')} required style={full} /></Field>
                <Field label="Contact person"><input value={f.contactPerson} onChange={set('contactPerson')} required style={full} /></Field>
                <Field label="Mobile number"><input value={f.phone} onChange={set('phone')} required placeholder="+263771234567" style={full} /></Field>
                <Field label="Email"><input type="email" value={f.email} onChange={set('email')} required style={full} /></Field>
                <Field label="National ID or company registration number"><input value={f.idNumber} onChange={set('idNumber')} style={full} /></Field>
                <Field label="Shop address / location"><input value={f.location} onChange={set('location')} required style={full} /></Field>
                <button type="submit" disabled={busy} className="btn btn-primary" style={submitBtn}>{busy ? 'Submitting…' : 'Submit application'}</button>
                <p style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}><Link to="/agent/login">Back to sign in</Link></p>
            </form>
        </Shell>
    );
}

export function AgentTrack() {
    const [params] = useSearchParams();
    const [ref, setRef] = useState(params.get('ref') || '');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e?.preventDefault();
        setError(''); setResult(null); setBusy(true);
        try { const r = await agentPortalApi.track(ref); setResult(r.data?.data || r.data); }
        catch (err) { setError(errorMessage(err, 'No application with that reference')); }
        finally { setBusy(false); }
    };
    const s = result && (STATUS[result.status] || { label: result.status, color: 'var(--text-2)', text: '' });
    return (
        <Shell title="Track your agent application">
            <form onSubmit={submit}>
                <Err>{error}</Err>
                <Field label="Application reference"><input value={ref} onChange={e => setRef(e.target.value)} required placeholder="AGT-…" style={full} /></Field>
                <button type="submit" disabled={busy} className="btn btn-primary" style={submitBtn}>{busy ? 'Checking…' : 'Check status'}</button>
            </form>
            {s && (
                <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'var(--bg-2)' }}>
                    <div style={{ fontWeight: 800, color: s.color }}>{s.label}</div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '6px 0 0' }}>{s.text}</p>
                </div>
            )}
            <p style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}><Link to="/agent/login">Agent sign in</Link></p>
        </Shell>
    );
}
