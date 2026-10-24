import { ExportArea } from '../components/kit';
import { useState, useEffect } from 'react';
import { Users, Plus, Copy, UserX, UserCheck, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi, getCurrentUser } from '../lib/api';

const ROLE_DESCRIPTIONS = {
    OWNER: 'Full access — team, API keys, webhooks, everything',
    DEVELOPER: 'API keys, webhooks, transactions — no team management',
    FINANCE: 'View transactions and reports only — no API keys or webhooks',
};

function InviteModal({ onClose, onInvited }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('FINANCE');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const res = await teamApi.invite(fullName, email, role);
            setResult(res.data?.data || res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not add team member');
        } finally {
            setSubmitting(false);
        }
    };

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
                {!result ? (
                    <form onSubmit={submit}>
                        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>Add a team member</h2>
                        {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Full name</label>
                        <input value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', marginBottom: 14 }} />

                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 14 }} />

                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
                            <option value="FINANCE">Finance</option>
                            <option value="DEVELOPER">Developer</option>
                            <option value="OWNER">Owner</option>
                        </select>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>{ROLE_DESCRIPTIONS[role]}</p>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                {submitting ? 'Adding…' : 'Add'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{result.fullName} added</h2>
                        <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700, marginBottom: 16 }}>{result.warning}</p>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Temporary password</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <code style={{ flex: 1, padding: 10, background: 'var(--bg-2)', borderRadius: 8, fontSize: 13, overflowX: 'auto' }}>{result.temporaryPassword}</code>
                            <button onClick={() => copy(result.temporaryPassword)} className="btn btn-ghost"><Copy size={14} /></button>
                        </div>
                        <button onClick={() => { onInvited(); onClose(); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            I've shared this — close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ResetPasswordModal({ member, onClose }) {
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(true);

    useEffect(() => {
        teamApi.resetPassword(member.id)
            .then(res => setResult(res.data?.data || res.data))
            .catch(err => setError(err.response?.data?.message || 'Could not reset password'))
            .finally(() => setSubmitting(false));
    }, [member.id]);

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
                {submitting ? (
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Resetting…</p>
                ) : error ? (
                    <>
                        <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>
                        <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Close</button>
                    </>
                ) : (
                    <>
                        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{member.fullName}'s password reset</h2>
                        <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700, marginBottom: 16 }}>{result.warning}</p>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>New temporary password</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <code style={{ flex: 1, padding: 10, background: 'var(--bg-2)', borderRadius: 8, fontSize: 13, overflowX: 'auto' }}>{result.temporaryPassword}</code>
                            <button onClick={() => copy(result.temporaryPassword)} className="btn btn-ghost"><Copy size={14} /></button>
                        </div>
                        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            I've shared this — close
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function Team() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const currentUser = getCurrentUser();

    const load = () => {
        setLoading(true);
        teamApi.list()
            .then(res => setMembers(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const toggleStatus = async (member) => {
        const action = member.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
        try {
            await (action === 'deactivate' ? teamApi.deactivate(member.id) : teamApi.reactivate(member.id));
            toast.success(`${member.fullName} ${action}d`);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || `Could not ${action}`);
        }
    };

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Users size={20} /> Team</h1>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>Who can access your Payport merchant account, and what they can see.</p>
                </div>
                <button onClick={() => setShowInvite(true)} className="btn btn-primary"><Plus size={14} /> Add member</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
                ) : (
                    <ExportArea name="Team"><table>
                        <thead>
                            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m.id}>
                                    <td style={{ fontWeight: 700 }}>{m.fullName} {m.id === currentUser?.id && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(you)</span>}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{m.email}</td>
                                    <td><span className="badge badge-gray">{m.role}</span></td>
                                    <td><span className={`badge ${m.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{m.status}</span></td>
                                    <td style={{ color: 'var(--text-2)' }}>{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : 'Never'}</td>
                                    <td>
                                        {m.id !== currentUser?.id && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => setResetTarget(m)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                    <KeyRound size={13} /> Reset password
                                                </button>
                                                <button onClick={() => toggleStatus(m)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                    {m.status === 'ACTIVE' ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Reactivate</>}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></ExportArea>
                )}
            </div>

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={load} />}
            {resetTarget && <ResetPasswordModal member={resetTarget} onClose={() => setResetTarget(null)} />}
        </div>
    );
}
