import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Download, ChevronDown, ChevronUp, RotateCcw, AlertTriangle, MessageCircleQuestion } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkoutSessionsApi, refundsApi, disputesApi, queriesApi, formatAmount, METHOD_LABELS } from '../lib/api';
import { FormButton } from '../components/kit';

const STATUS_BADGE = {
    PAID: 'badge-green',
    FAILED: 'badge-red',
    EXPIRED: 'badge-gray',
    CANCELLED: 'badge-gray',
    PENDING: 'badge-amber',
    CREATED: 'badge-gray',
    PARTIALLY_REFUNDED: 'badge-amber',
    REFUNDED: 'badge-red',
};

function RefundModal({ session, onClose, onRefunded }) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const cents = amount ? Math.round(parseFloat(amount) * 100) : null;
            await refundsApi.create(session.id, cents, reason);
            toast.success('Refund recorded');
            onRefunded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not record refund');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Refund {session.reference}</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 18 }}>
                    Full amount: {formatAmount(session.amountCents, session.currency)}. Leave the amount blank for a full refund.
                </p>
                {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Amount (leave blank for full refund)</label>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Up to ${(session.amountCents / 100).toFixed(2)}`} style={{ width: '100%', marginBottom: 14 }} />

                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Reason</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Customer requested, duplicate charge, etc." style={{ width: '100%', marginBottom: 20 }} />

                <div style={{ background: 'var(--badge-amber)', color: '#92600A', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 20 }}>
                    This records the refund and adjusts your balance. It doesn't automatically send money back through EcoCash/OneMoney/Omari/ZimSwitch yet — contact Payport support to coordinate the actual payout.
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                        {submitting ? 'Recording…' : 'Record refund'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function SessionDetail({ session }) {
    const [refunds, setRefunds] = useState(null);
    const [disputes, setDisputes] = useState(null);
    const [queries, setQueries] = useState(null);

    useEffect(() => {
        refundsApi.list(session.id).then(res => setRefunds(res.data?.data || res.data || []));
        disputesApi.list(session.id).then(res => setDisputes(res.data?.data || res.data || []));
        queriesApi.listForSession(session.id).then(res => setQueries(res.data?.data || res.data || []));
    }, [session.id]);

    const QUERY_STATUS_BADGE = { OPEN: 'badge-amber', IN_PROGRESS: 'badge-amber', RESOLVED: 'badge-green' };

    return (
        <div style={{ padding: '16px 22px', background: 'var(--bg-2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 24 }}>
                <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 8 }}>Refunds</h4>
                    {refunds === null ? (
                        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Loading…</p>
                    ) : refunds.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>None</p>
                    ) : (
                        refunds.map(r => (
                            <div key={r.id} style={{ fontSize: 12.5, marginBottom: 6 }}>
                                {formatAmount(r.amountCents, session.currency)} — {r.reason || 'No reason given'}
                                <span style={{ color: 'var(--text-faint)' }}> · {new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))
                    )}
                </div>
                <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 8 }}>Disputes</h4>
                    {disputes === null ? (
                        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Loading…</p>
                    ) : disputes.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>None</p>
                    ) : (
                        disputes.map(d => (
                            <div key={d.id} style={{ fontSize: 12.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={12} color="var(--amber)" />
                                {formatAmount(d.amountCents, session.currency)} — <span className={`badge ${d.status === 'WON' ? 'badge-green' : d.status === 'LOST' ? 'badge-red' : 'badge-amber'}`}>{d.status}</span>
                            </div>
                        ))
                    )}
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', margin: 0 }}>Queries to Payport</h4>
                        <Link to="/queries" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, textDecoration: 'none' }}>
                            <MessageCircleQuestion size={12} /> Ask / view conversation
                        </Link>
                    </div>

                    {queries === null ? (
                        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Loading…</p>
                    ) : queries.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>None</p>
                    ) : (
                        queries.map(q => (
                            <Link key={q.id} to="/queries" style={{ display: 'block', fontSize: 12.5, marginBottom: 10, textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontWeight: 700 }}>{q.subject}</span>
                                    <span className={`badge ${QUERY_STATUS_BADGE[q.status] || 'badge-gray'}`}>{q.status}</span>
                                </div>
                                <div style={{ color: 'var(--text-faint)', fontFamily: 'monospace', fontSize: 11 }}>
                                    {q.referenceNumber || `#${q.id}`} · {new Date(q.createdAt).toLocaleDateString()}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function toCsv(sessions) {
    const headers = ['Reference', 'Description', 'Amount', 'Currency', 'Method', 'Customer', 'Status', 'Created'];
    const rows = sessions.map(s => [
        s.reference,
        (s.description || '').replace(/,/g, ';'),
        (s.amountCents / 100).toFixed(2),
        s.currency,
        METHOD_LABELS[s.paymentMethodCode] || s.paymentMethodCode || '',
        s.customerPhone || s.customerEmail || '',
        s.status,
        new Date(s.createdAt).toISOString(),
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export default function Transactions() {
    const [sessions, setSessions] = useState([]);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [refundTarget, setRefundTarget] = useState(null);
    const [created, setCreated] = useState(null);

    const load = () => {
        setLoading(true);
        checkoutSessionsApi.list(statusFilter === 'ALL' ? null : statusFilter)
            .then(res => setSessions(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, [statusFilter]);

    const filtered = sessions.filter(s => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return s.reference?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.customerPhone?.toLowerCase().includes(q) ||
            s.customerEmail?.toLowerCase().includes(q);
    });

    const exportCsv = () => {
        const csv = toCsv(filtered);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payport-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Transactions</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <FormButton label="Request payment" title="New payment request" submitLabel="Create"
                        fields={[{ name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
                            { name: 'currency', label: 'Currency', type: 'currency', required: true, initial: 'USD' },
                            { name: 'description', label: 'What it is for', required: true },
                            { name: 'reference', label: 'Your reference (optional)' },
                            { name: 'customerPhone', label: 'Customer phone (optional)' }, { name: 'customerEmail', label: 'Customer email (optional)' }]}
                        onSubmit={v => checkoutSessionsApi.create({
                            reference: v.reference?.trim() || `REQ-${Date.now()}`, amountCents: Math.round(Number(v.amount) * 100), currency: v.currency,
                            description: v.description, customerPhone: v.customerPhone?.trim() || null, customerEmail: v.customerEmail?.trim() || null })}
                        onDone={d => { setCreated(d); load(); }} />
                    <button onClick={exportCsv} className="btn btn-ghost"><Download size={14} /> Export CSV</button>
                    <button onClick={load} className="btn btn-ghost"><RefreshCw size={14} /> Refresh</button>
                </div>
            </div>

            {created?.checkoutUrl && (
                <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13 }}>Payment link:</strong>
                    <a href={created.checkoutUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: 12.5, wordBreak: 'break-all', flex: 1 }}>{created.checkoutUrl}</a>
                    <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(created.checkoutUrl); toast.success('Copied'); }}>Copy</button>
                    <button className="btn btn-ghost" onClick={() => setCreated(null)}>Close</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search reference, description, customer…"
                    style={{ flex: '1 1 260px', minWidth: 220 }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['ALL', 'CREATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map(s => (
                        <button
                            key={s} onClick={() => setStatusFilter(s)}
                            className={statusFilter === s ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{ fontSize: 12, padding: '7px 12px' }}
                        >{s}</button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No transactions match.</div>
                ) : (
                    <table>
                        <thead>
                            <tr><th></th><th>Reference</th><th>Method</th><th>Amount</th><th>Customer</th><th>Status</th><th>Created</th><th></th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => (
                                <Fragment key={s.id}>
                                    <tr>
                                        <td style={{ width: 30 }}>
                                            <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}>
                                                {expandedId === s.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                            </button>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{s.reference}</td>
                                        <td style={{ color: 'var(--text-2)' }}>{METHOD_LABELS[s.paymentMethodCode] || s.paymentMethodCode || '—'}</td>
                                        <td style={{ fontWeight: 700 }}>{formatAmount(s.amountCents, s.currency)}</td>
                                        <td style={{ color: 'var(--text-2)' }}>{s.customerPhone || s.customerEmail || '—'}</td>
                                        <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                                        <td style={{ color: 'var(--text-2)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {(s.status === 'PAID' || s.status === 'PARTIALLY_REFUNDED') && (
                                                <button onClick={() => setRefundTarget(s)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                                                    <RotateCcw size={12} /> Refund
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedId === s.id && (
                                        <tr>
                                            <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                                                <SessionDetail session={s} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {refundTarget && (
                <RefundModal session={refundTarget} onClose={() => setRefundTarget(null)} onRefunded={load} />
            )}
        </div>
    );
}
