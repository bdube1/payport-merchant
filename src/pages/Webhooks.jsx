import { useState, useEffect } from 'react';
import { Webhook as WebhookIcon, Plus, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { webhooksApi } from '../lib/api';
import { Act, ExportArea } from '../components/kit';

function RegisterModal({ onClose, onRegistered }) {
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const res = await webhooksApi.register(url);
            setResult(res.data?.data || res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not register webhook');
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
                        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Register a webhook</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 18 }}>
                            We'll POST a signed event here whenever a checkout session is paid or fails.
                        </p>
                        {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}
                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Endpoint URL</label>
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)} required style={{ width: '100%', marginBottom: 20 }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                {submitting ? 'Registering…' : 'Register'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Webhook registered</h2>
                        <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700, marginBottom: 16 }}>{result.warning}</p>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Signing secret</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <code style={{ flex: 1, padding: 10, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12.5, overflowX: 'auto' }}>{result.secret}</code>
                            <button onClick={() => copy(result.secret)} className="btn btn-ghost"><Copy size={14} /></button>
                        </div>
                        <button onClick={() => { onRegistered(); onClose(); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            I've saved this — close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DeliveryLog({ webhookId }) {
    const [deliveries, setDeliveries] = useState(null);

    useEffect(() => {
        webhooksApi.deliveries(webhookId)
            .then(res => setDeliveries(res.data?.data || res.data || []));
    }, [webhookId]);

    if (deliveries === null) return <div style={{ padding: '16px 22px', color: 'var(--text-2)', fontSize: 13 }}>Loading deliveries…</div>;
    if (deliveries.length === 0) return <div style={{ padding: '16px 22px', color: 'var(--text-2)', fontSize: 13 }}>No delivery attempts yet.</div>;

    return (
        <ExportArea name="Webhooks"><table>
            <thead>
                <tr><th>Event</th><th>Event ID</th><th>Status</th><th>Attempts</th><th>Response</th><th>Last attempt</th><th></th></tr>
            </thead>
            <tbody>
                {deliveries.map(d => (
                    <tr key={d.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.eventType}{d.replayOf ? ` (replay of #${d.replayOf})` : ''}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.eventId || '—'}</td>
                        <td><span className={`badge ${d.status === 'DELIVERED' ? 'badge-green' : d.status === 'FAILED' ? 'badge-red' : 'badge-amber'}`}>{d.status}</span></td>
                        <td>{d.attemptCount}</td>
                        <td style={{ color: 'var(--text-2)' }}>{d.responseStatus ?? '—'}</td>
                        <td style={{ color: 'var(--text-2)' }}>{d.lastAttemptAt ? new Date(d.lastAttemptAt).toLocaleString() : '—'}</td>
                        <td><Act label="Replay" kind="ghost" run={() => webhooksApi.replay(d.id)} done="Queued again (same event ID, so you can de-duplicate)" /></td>
                    </tr>
                ))}
            </tbody>
        </table></ExportArea>
    );
}

export default function Webhooks() {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRegister, setShowRegister] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const load = () => {
        setLoading(true);
        webhooksApi.list()
            .then(res => setWebhooks(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Webhooks</h1>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>Get notified the moment a checkout session is paid or fails.</p>
                </div>
                <button onClick={() => setShowRegister(true)} className="btn btn-primary"><Plus size={14} /> Register webhook</button>
            </div>

            {loading ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : webhooks.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>
                    <WebhookIcon size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p>No webhooks registered yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {webhooks.map(w => (
                        <div key={w.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <button
                                onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'monospace' }}>{w.url}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>Registered {new Date(w.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span className={`badge ${w.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{w.status}</span>
                                    {expandedId === w.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {expandedId === w.id && (
                                <div style={{ borderTop: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexWrap: 'wrap' }}>
                                        <Act label="Send test event" kind="ghost" run={() => webhooksApi.test(w.id)} done="Test event queued" />
                                        <Act label="Rotate secret" kind="ghost" confirm="Create a new signing secret? The current one stops working immediately."
                                             run={() => webhooksApi.rotateSecret(w.id)} done={(r) => window.prompt('New signing secret (shown once). Copy it now:', r?.secret || '')} />
                                        {w.status === 'ACTIVE' && <Act label="Disable" kind="danger" confirm="Stop sending events to this endpoint?" run={() => webhooksApi.disable(w.id)} done={load} />}
                                    </div>
                                    <div style={{ padding: '0 20px 12px', fontSize: 12.5, color: 'var(--text-2)' }}>
                                        Verify every event: read <code>PayPort-Signature: t=…,v1=…</code>, compute the hex HMAC-SHA256 of <code>{'{t}.{raw body}'}</code> with your secret, compare it with <code>v1</code> in constant time, and reject old timestamps. Use the event ID to ignore duplicates. Endpoints must be https and public.
                                    </div>
                                    <DeliveryLog webhookId={w.id} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onRegistered={load} />}
        </div>
    );
}
