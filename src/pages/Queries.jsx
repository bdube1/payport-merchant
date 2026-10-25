import { useState, useEffect } from 'react';
import { MessageCircleQuestion, Plus, Search, Paperclip, X, Send, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { queriesApi, checkoutSessionsApi, formatAmount } from '../lib/api';

const STATUS_BADGE = { OPEN: 'badge-amber', IN_PROGRESS: 'badge-amber', RESOLVED: 'badge-green' };

function formatTimestamp(iso) {
    return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function NewQueryModal({ onClose, onSent }) {
    const [reference, setReference] = useState('');
    const [session, setSession] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [looking, setLooking] = useState(false);

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const lookup = async (e) => {
        e.preventDefault();
        if (!reference.trim()) return;
        setLookupError('');
        setLooking(true);
        setSession(null);
        try {
            const res = await checkoutSessionsApi.getByReference(reference.trim());
            setSession(res.data?.data || res.data);
        } catch (err) {
            setLookupError(err.response?.data?.message || "Couldn't find a transaction with that reference");
        } finally {
            setLooking(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const res = await queriesApi.raise(session.id, subject, message);
            const query = res.data?.data || res.data;
            if (file) {
                try {
                    await queriesApi.uploadAttachment(query.id, file);
                } catch {
                    toast.error("Query sent, but the attachment didn't upload — you can try again from the query itself.");
                }
            }
            toast.success(`Query ${query.referenceNumber} sent to Payport support`);
            onSent();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send query');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>Ask Payport a question</h2>

                {!session ? (
                    <form onSubmit={lookup}>
                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Transaction reference</label>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
                            Enter the reference number for the transaction your question is about — every query has to be tied to one.
                        </p>
                        {lookupError && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{lookupError}</div>}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <input value={reference} onChange={e => setReference(e.target.value)} style={{ flex: 1 }} autoFocus />
                            <button type="submit" disabled={looking || !reference.trim()} className="btn btn-primary">
                                <Search size={14} /> {looking ? 'Looking…' : 'Find'}
                            </button>
                        </div>
                        <button type="button" onClick={onClose} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Cancel</button>
                    </form>
                ) : (
                    <form onSubmit={submit}>
                        <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 12.5, marginBottom: 4 }}>{session.reference}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{session.description || 'No description'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800 }}>{formatAmount(session.amountCents, session.currency)}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{session.status}</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setSession(null); setReference(''); }} className="btn btn-ghost" style={{ fontSize: 11.5, padding: '4px 8px', marginTop: 10 }}>
                                Not this one? Change
                            </button>
                        </div>

                        {error && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Subject</label>
                        <input value={subject} onChange={e => setSubject(e.target.value)} required style={{ width: '100%', marginBottom: 14 }} />

                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>What's the question?</label>
                        <textarea
                            value={message} onChange={e => setMessage(e.target.value)} required rows={4}
                            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }}
                        />

                        <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Attach a document (optional)</label>
                        {file ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 20 }}>
                                <Paperclip size={13} /> {file.name}
                                <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={13} /></button>
                            </div>
                        ) : (
                            <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'inline-flex', marginBottom: 20, fontSize: 12.5 }}>
                                <Paperclip size={13} /> Choose file
                                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                            </label>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                {submitting ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function QueryThread({ query, onChanged }) {
    const [messages, setMessages] = useState(null);
    const [attachments, setAttachments] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [attachFile, setAttachFile] = useState(null);
    const [sending, setSending] = useState(false);

    const load = () => {
        queriesApi.listMessages(query.id).then(res => setMessages(res.data?.data || res.data || []));
        queriesApi.listAttachments(query.id).then(res => setAttachments(res.data?.data || res.data || []));
    };

    useEffect(load, [query.id]);

    const send = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !attachFile) return;
        setSending(true);
        try {
            if (newMessage.trim()) {
                await queriesApi.addMessage(query.id, newMessage.trim());
            }
            if (attachFile) {
                try {
                    await queriesApi.uploadAttachment(query.id, attachFile);
                } catch {
                    toast.error("Message sent, but the file didn't upload — try attaching it again.");
                }
            }
            setNewMessage('');
            setAttachFile(null);
            load();
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send message');
        } finally {
            setSending(false);
        }
    };

    const reopen = async () => {
        try {
            await queriesApi.reopen(query.id, "Reopened — I'm not satisfied with the resolution.");
            toast.success('Query reopened');
            load();
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not reopen query');
        }
    };

    return (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {messages === null ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Loading…</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {messages.map(m => (
                        m.eventType === 'REOPENED' ? (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--amber)', fontWeight: 700, padding: '4px 0' }}>
                                <RotateCcw size={12} /> Reopened by {m.senderName || 'you'} · {formatTimestamp(m.createdAt)}
                                {m.message && <span style={{ fontWeight: 400, color: 'var(--text-2)' }}> — {m.message}</span>}
                            </div>
                        ) : (
                            <div key={m.id} style={{
                                alignSelf: m.senderType === 'STAFF' ? 'flex-start' : 'flex-end',
                                maxWidth: '85%',
                                background: m.senderType === 'STAFF' ? 'var(--bg-2)' : 'rgba(6,163,218,0.10)',
                                borderRadius: 10, padding: '10px 12px',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: m.senderType === 'STAFF' ? 'var(--blue)' : 'var(--text-2)', marginBottom: 3 }}>
                                    {m.senderType === 'STAFF' ? `Payport${m.senderName ? ' — ' + m.senderName : ''}` : (m.senderName || 'You')}
                                </div>
                                <div style={{ fontSize: 13.5 }}>{m.message}</div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 4 }}>{formatTimestamp(m.createdAt)}</div>
                            </div>
                        )
                    ))}
                </div>
            )}

            {attachments && attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {attachments.map(a => (
                        <button key={a.id} type="button" title="Download"
                            onClick={async () => {
                                const r = await queriesApi.downloadAttachment(query.id, a.id);
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(r.data);
                                link.download = a.originalFilename || 'attachment';
                                link.click();
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '5px 10px', background: 'var(--bg-2)', borderRadius: 8, color: 'var(--text-2)', border: 'none', cursor: 'pointer' }}>
                            <Paperclip size={11} /> {a.originalFilename}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={send}>
                {attachFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, color: 'var(--text-2)' }}>
                        <Paperclip size={12} /> {attachFile.name}
                        <button type="button" onClick={() => setAttachFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={12} /></button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={newMessage} onChange={e => setNewMessage(e.target.value)}
                        placeholder={query.status === 'RESOLVED' ? 'Sending a message will reopen this query…' : 'Type a message…'}
                        style={{ flex: 1 }}
                    />
                    <label className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: 12.5, padding: '9px 12px' }} title="Attach a document">
                        <Paperclip size={13} />
                        <input type="file" onChange={e => setAttachFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                    </label>
                    <button type="submit" disabled={sending || (!newMessage.trim() && !attachFile)} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                        <Send size={13} /> Send
                    </button>
                </div>
            </form>
            {query.status === 'RESOLVED' && (
                <button onClick={reopen} className="btn btn-ghost" style={{ fontSize: 11.5, marginTop: 8 }}>
                    Not satisfied? Reopen without a message
                </button>
            )}
        </div>
    );
}

export default function Queries() {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');

    const load = () => {
        setLoading(true);
        queriesApi.listAll().then(res => setQueries(res.data?.data || res.data || [])).finally(() => setLoading(false));
    };

    useEffect(load, []);

    const runSearch = async (e) => {
        e.preventDefault();
        if (!search.trim()) { setSearchResult(null); return; }
        setSearchError('');
        setSearching(true);
        try {
            const res = await queriesApi.getByReference(search.trim());
            const q = res.data?.data || res.data;
            setSearchResult(q);
            setExpandedId(q.id);
        } catch (err) {
            setSearchResult(null);
            setSearchError(err.response?.data?.message || 'No query found with that reference');
        } finally {
            setSearching(false);
        }
    };

    const clearSearch = () => {
        setSearch('');
        setSearchResult(null);
        setSearchError('');
    };

    const displayed = searchResult ? [searchResult] : queries;

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MessageCircleQuestion size={20} /> Queries
                    </h1>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>Questions you've raised with Payport about specific transactions.</p>
                </div>
                <button onClick={() => setShowNew(true)} className="btn btn-primary"><Plus size={14} /> Ask a question</button>
            </div>

            <form onSubmit={runSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by query reference"
                    style={{ flex: '1 1 320px', maxWidth: 420 }}
                />
                <button type="submit" disabled={searching} className="btn btn-ghost"><Search size={14} /> Search</button>
                {searchResult && <button type="button" onClick={clearSearch} className="btn btn-ghost">Clear</button>}
            </form>
            {searchError && <div style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{searchError}</div>}

            {loading ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : displayed.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>
                    <MessageCircleQuestion size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p>No queries yet. Have a question about a transaction? Click "Ask a question" above.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {displayed.map(q => (
                        <div key={q.id} className="card" style={{ padding: 20 }}>
                            <button
                                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 15 }}>{q.subject}</span>
                                            <span className={`badge ${STATUS_BADGE[q.status] || 'badge-gray'}`}>{q.status.replace('_', ' ')}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                                            {q.referenceNumber || `#${q.id}`} · Transaction #{q.checkoutSessionId} · {formatTimestamp(q.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {expandedId === q.id && <QueryThread query={q} onChanged={load} />}
                        </div>
                    ))}
                </div>
            )}

            {showNew && <NewQueryModal onClose={() => setShowNew(false)} onSent={load} />}
        </div>
    );
}
