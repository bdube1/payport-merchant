import { useState, useEffect } from 'react';
import { Link2, Plus, Copy, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentLinksApi, formatAmount } from '../lib/api';

function CreateModal({ onClose, onCreated }) {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [description, setDescription] = useState('');
    const [reusable, setReusable] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const cents = amount ? Math.round(parseFloat(amount) * 100) : null;
            await paymentLinksApi.create(cents, currency, description, reusable);
            toast.success('Payment link created');
            onCreated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not create payment link');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>Create a payment link</h2>
                {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Amount (leave blank to let the customer enter their own)</label>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10.00" style={{ width: '100%', marginBottom: 14 }} />

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: '100%', marginBottom: 14 }}>
                    <option value="USD">USD</option>
                    <option value="ZWG">ZWG</option>
                </select>

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Consulting fee, product name, etc." style={{ width: '100%', marginBottom: 14 }} />

                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <input type="checkbox" checked={reusable} onChange={e => setReusable(e.target.checked)} style={{ width: 'auto' }} />
                    Reusable — leave checked unless this is for a one-time payment
                </label>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                        {submitting ? 'Creating…' : 'Create link'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function PaymentLinks() {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const load = () => {
        setLoading(true);
        paymentLinksApi.list()
            .then(res => setLinks(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Link copied'); };

    const disable = async (link) => {
        try {
            await paymentLinksApi.disable(link.id);
            toast.success('Link disabled');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not disable link');
        }
    };

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Link2 size={20} /> Payment Links</h1>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>Share a link to get paid without writing any integration code.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={14} /> Create link</button>
            </div>

            {loading ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : links.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>
                    <Link2 size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p>No payment links yet.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table>
                        <thead>
                            <tr><th>Description</th><th>Amount</th><th>Reusable</th><th>Status</th><th>Link</th><th></th></tr>
                        </thead>
                        <tbody>
                            {links.map(l => (
                                <tr key={l.id}>
                                    <td style={{ fontWeight: 700 }}>{l.description || '—'}</td>
                                    <td>{l.amountCents ? formatAmount(l.amountCents, l.currency) : <span style={{ color: 'var(--text-faint)' }}>Customer sets amount</span>}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{l.reusable ? 'Yes' : 'One-time'}</td>
                                    <td><span className={`badge ${l.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{l.status}</span></td>
                                    <td>
                                        <button onClick={() => copy(l.url)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, fontFamily: 'monospace' }}>
                                            <Copy size={12} /> {l.slug}
                                        </button>
                                    </td>
                                    <td>
                                        {l.status === 'ACTIVE' && (
                                            <button onClick={() => disable(l)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                <Ban size={12} /> Disable
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
        </div>
    );
}
