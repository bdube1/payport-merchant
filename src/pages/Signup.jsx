import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, errorMessage, DOC_TYPES, uploadDocumentWithToken } from '../lib/api.js';

// Merchant application form. Creates the business and its owner login in one step
// (POST /api/v1/merchant-portal/signup). The account stays PENDING until PayPort's KYB review
// (two staff members) approves it; the applicant can sign in straight away to track the review
// and answer questions, but gets no API keys or live payments until approved.

const CATEGORIES = [
    ['RETAIL', 'Retail / shop'],
    ['ECOMMERCE', 'Online store'],
    ['FOOD', 'Food and restaurants'],
    ['SERVICES', 'Professional services'],
    ['EDUCATION', 'Education / school fees'],
    ['HEALTH', 'Health / pharmacy'],
    ['TRANSPORT', 'Transport and logistics'],
    ['UTILITIES', 'Utilities and bills'],
    ['NGO', 'NGO / church / charity'],
    ['OTHER', 'Other'],
];

// Mirrors the backend password policy (MerchantService.validatePasswordPolicy); the server checks again.
function passwordProblems(p) {
    const out = [];
    if (p.length < 8) out.push('at least 8 characters');
    if (!/[A-Z]/.test(p)) out.push('an uppercase letter');
    if (!/[a-z]/.test(p)) out.push('a lowercase letter');
    if (!/\d/.test(p)) out.push('a digit');
    if (!/[^A-Za-z0-9]/.test(p)) out.push('a special character');
    return out;
}

const label = { fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 };
const field = { width: '100%', marginBottom: 16 };

export default function Signup() {
    const [form, setForm] = useState({
        businessName: '', registrationNumber: '', businessCategory: '', contactEmail: '', contactPhone: '',
        ownerFullName: '', password: '', confirm: '',
    });
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(null);
    const [files, setFiles] = useState({});
    const [uploads, setUploads] = useState([]);
    const [copied, setCopied] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const pwProblems = form.password ? passwordProblems(form.password) : [];

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (pwProblems.length) return setError('Password needs ' + pwProblems.join(', ') + '.');
        if (form.password !== form.confirm) return setError('The two passwords do not match.');
        if (!accepted) return setError('Please confirm the declaration.');
        const tooBig = Object.entries(files).find(([, f]) => f && f.size > 10 * 1024 * 1024);
        if (tooBig) return setError(`${(DOC_TYPES.find(d => d.value === tooBig[0]) || {}).label} is larger than 10 MB.`);
        setLoading(true);
        try {
            const { confirm, ...body } = form;
            const res = await authApi.signup({ ...body, contactEmail: body.contactEmail.trim(), businessName: body.businessName.trim() });
            const app = res.data?.data;
            // Attach the KYC documents chosen on the form, signed in as the new applicant.
            const chosen = Object.entries(files).filter(([, f]) => f);
            const results = [];
            if (chosen.length) {
                try {
                    const login = await authApi.login(body.contactEmail.trim(), body.password);
                    const token = (login.data?.data || login.data)?.token;
                    for (const [type, file] of chosen) {
                        try { await uploadDocumentWithToken(token, type, file); results.push({ type, ok: true }); }
                        catch (err) { results.push({ type, ok: false, message: errorMessage(err, 'Upload failed') }); }
                    }
                } catch {
                    chosen.forEach(([type]) => results.push({ type, ok: false, message: 'Sign in to upload it' }));
                }
            }
            setUploads(results);
            setDone(app);
        } catch (err) {
            setError(errorMessage(err, 'We could not submit your application. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
                <div className="card" style={{ width: '100%', maxWidth: 460, padding: 36, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 8px' }}>Application received</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 18px', lineHeight: 1.6 }}>
                        Thank you. {done.businessName} is now under review. Your application reference is
                    </p>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 10, marginBottom: 18 }}>
                        {done.applicationReference}
                    </div>
                    <button type="button" className="btn btn-ghost" style={{ marginBottom: 14 }}
                        onClick={() => { navigator.clipboard?.writeText(done.applicationReference); setCopied(true); }}>{copied ? 'Copied' : 'Copy reference'}</button>
                    <div style={{ background: 'var(--badge-amber, #FEF3C7)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 18px', textAlign: 'left' }}>
                        <strong>Keep this application reference number.</strong> You will need it to track your application.
                        We have also emailed it to you.
                    </div>
                    {uploads.length > 0 && (
                        <div style={{ textAlign: 'left', fontSize: 13, margin: '0 0 18px' }}>
                            {uploads.map(u => (
                                <div key={u.type} style={{ color: u.ok ? 'var(--green, #2f855a)' : 'var(--red)' }}>
                                    {u.ok ? '✓' : '✗'} {(DOC_TYPES.find(d => d.value === u.type) || {}).label || u.type}{u.ok ? '' : ` — ${u.message}`}
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Link to={`/track?ref=${encodeURIComponent(done.applicationReference)}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: 13 }}>Track application</Link>
                        <Link to="/login" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 13 }}>Sign in</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
            <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 520, padding: 36 }} noValidate>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <img src="/favicon.png" alt="" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 12 }} />
                    <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Apply for a merchant account</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>Accept mobile money and card payments with PayPort</p>
                </div>

                {error && (
                    <div role="alert" style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18 }}>
                        {error}
                    </div>
                )}

                <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-2)', margin: '0 0 12px' }}>Business</h2>
                <label style={label} htmlFor="businessName">Registered business name</label>
                <input id="businessName" value={form.businessName} onChange={set('businessName')} required style={field} autoComplete="organization" />

                <label style={label} htmlFor="registrationNumber">Company registration number</label>
                <input id="registrationNumber" value={form.registrationNumber} onChange={set('registrationNumber')} required style={field} />

                <label style={label} htmlFor="businessCategory">What does the business do?</label>
                <select id="businessCategory" value={form.businessCategory} onChange={set('businessCategory')} required style={field}>
                    <option value="">Choose one</option>
                    {CATEGORIES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>

                <label style={label} htmlFor="contactPhone">Business phone</label>
                <input id="contactPhone" type="tel" value={form.contactPhone} onChange={set('contactPhone')} required placeholder="+263 77 123 4567" style={field} autoComplete="tel" />

                <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-2)', margin: '8px 0 12px' }}>Your login (account owner)</h2>
                <label style={label} htmlFor="ownerFullName">Full name</label>
                <input id="ownerFullName" value={form.ownerFullName} onChange={set('ownerFullName')} required style={field} autoComplete="name" />

                <label style={label} htmlFor="contactEmail">Email</label>
                <input id="contactEmail" type="email" value={form.contactEmail} onChange={set('contactEmail')} required style={field} autoComplete="email" />

                <label style={label} htmlFor="password">Password</label>
                <input id="password" type="password" value={form.password} onChange={set('password')} required style={{ ...field, marginBottom: 6 }} autoComplete="new-password" />
                <p style={{ fontSize: 12, color: pwProblems.length ? 'var(--text-2)' : 'var(--green, #2f855a)', margin: '0 0 16px' }}>
                    {form.password ? (pwProblems.length ? 'Still needs ' + pwProblems.join(', ') + '.' : 'Strong enough.') : '8+ characters with upper and lower case, a digit and a special character.'}
                </p>

                <label style={label} htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} required style={field} autoComplete="new-password" />

                <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-2)', margin: '8px 0 12px' }}>KYC documents (PDF, JPG or PNG, up to 10 MB)</h2>
                {DOC_TYPES.map(d => (
                    <div key={d.value} style={{ marginBottom: 12 }}>
                        <label style={label} htmlFor={`doc-${d.value}`}>{d.label}</label>
                        <input id={`doc-${d.value}`} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                            onChange={e => setFiles(f => ({ ...f, [d.value]: e.target.files?.[0] || null }))} style={{ width: '100%' }} />
                    </div>
                ))}

                <label style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8, margin: '4px 0 22px', cursor: 'pointer', lineHeight: 1.5 }}>
                    <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
                    I confirm the information is true and that PayPort may verify the business, its directors and its bank account before approving it.
                </label>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                    {loading ? 'Submitting…' : 'Submit application'}
                </button>

                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 18 }}>
                    Already applied? <Link to="/track">Track your application</Link> or <Link to="/login">sign in</Link>
                </p>
            </form>
        </div>
    );
}
