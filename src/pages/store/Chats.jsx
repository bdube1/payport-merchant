import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Flag, Ban, ShieldAlert } from 'lucide-react';
import { Section, Notice } from '../../components/kit';
import { storeApi } from '../../lib/commerce';
import { errorMessage } from '../../lib/api';

const data = (r) => r?.data?.data;
const CHANNEL = { WEB: 'Website', APP: 'App', WHATSAPP: 'WhatsApp', USSD: 'USSD' };
const FLAG = { OFF_PLATFORM: 'Asks to pay outside Payport', ABUSE: 'Abusive' };
const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13.5 };

function WhatCustomersAsk() {
    const [x, setX] = useState(null);
    useEffect(() => { storeApi.chatInsights().then(r => setX(data(r))).catch(() => setX(null)); }, []);
    if (!x) return null;
    return (
        <Section title="What customers ask (90 days)">
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, marginBottom: 12 }}>
                <span><strong>{x.conversations}</strong> conversations</span>
                <span><strong>{x.customerMessages}</strong> customer messages</span>
                <span><strong>{x.flagged}</strong> flagged</span>
                <span><strong>{x.reports}</strong> customers reported</span>
            </div>
            {x.topics.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-2)' }}>—</div> : x.topics.map(t => (
                <div key={t.topic} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 70px', gap: 10, alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                    <span>{t.topic}</span>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-2)' }}><div style={{ width: `${t.share}%`, height: '100%', borderRadius: 99, background: 'var(--primary, #06A3DA)' }} /></div>
                    <span style={{ textAlign: 'right' }}>{t.messages} · {t.share}%</span>
                </div>
            ))}
        </Section>
    );
}

function ReportCustomer({ chat, onClose }) {
    const [reasons, setReasons] = useState({});
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { storeApi.chatReasons().then(r => setReasons(data(r) || {})).catch(() => {}); }, []);
    const send = async (e) => {
        e.preventDefault();
        if (!window.confirm('Are you sure?')) return;
        setBusy(true);
        try {
            const r = data(await storeApi.chatReport(chat.id, reason, details));
            toast.success(r?.complaintRef ? `Reported. Reference ${r.complaintRef}` : 'Reported');
            onClose();
        } catch (err) { toast.error(errorMessage(err, 'Could not report')); }
        finally { setBusy(false); }
    };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
            <form className="card" style={{ width: '100%', maxWidth: 440, padding: 22, display: 'grid', gap: 12 }} onSubmit={send} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Report {chat.customer}</h3>
                <select style={field} value={reason} onChange={e => setReason(e.target.value)} required>
                    <option value="">Reason</option>
                    {Object.entries(reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <textarea style={{ ...field, minHeight: 90 }} value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} placeholder="Details" />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !reason}>{busy ? 'Sending…' : 'Report'}</button>
                </div>
            </form>
        </div>
    );
}

export default function Chats({ canManage }) {
    const [list, setList] = useState(null);
    const [open, setOpen] = useState(null);
    const [thread, setThread] = useState(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [error, setError] = useState('');
    const end = useRef(null);

    const loadList = () => storeApi.chats().then(r => { setList(data(r)?.chats || []); setError(''); }).catch(e => setError(errorMessage(e, 'Could not load chats')));
    const loadThread = (id) => storeApi.chat(id).then(r => setThread(data(r))).catch(() => {});
    useEffect(() => { loadList(); const t = setInterval(loadList, 10000); return () => clearInterval(t); }, []);
    useEffect(() => {
        if (!open) return undefined;
        loadThread(open);
        const t = setInterval(() => loadThread(open), 5000);
        return () => clearInterval(t);
    }, [open]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages?.length]);

    const reply = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        try { setThread(data(await storeApi.chatReply(open, text))); setText(''); loadList(); }
        catch (err) { toast.error(errorMessage(err, 'Not sent')); }
        finally { setBusy(false); }
    };
    const block = async () => {
        if (!window.confirm('Are you sure?')) return;
        try { setThread(data(await storeApi.chatBlock(open, !thread.blocked))); loadList(); }
        catch (err) { toast.error(errorMessage(err, 'Could not change')); }
    };

    return (
        <>
            {error && <Notice kind="error">{error}</Notice>}
            <WhatCustomersAsk />
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', minHeight: 520, overflow: 'hidden', padding: 0 }}>
                <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', maxHeight: 640 }}>
                    {list && list.length === 0 && <div style={{ padding: 18, fontSize: 13, color: 'var(--text-2)' }}>No conversations yet.</div>}
                    {(list || []).map(c => (
                        <button key={c.id} onClick={() => setOpen(c.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', border: 0, borderBottom: '1px solid var(--border)',
                            background: open === c.id ? 'var(--bg-2)' : 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <strong style={{ fontSize: 13.5 }}>{c.customer}</strong>
                                {c.unread > 0 && <span className="badge badge-blue">{c.unread}</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-2)', margin: '2px 0' }}>{CHANNEL[c.channel] || c.channel}{c.product ? ` · ${c.product}` : ''}{c.flagged ? ' · ' : ''}{c.flagged && <ShieldAlert size={12} style={{ verticalAlign: -2, color: 'var(--red)' }} />}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.preview}</div>
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {!thread ? <div style={{ margin: 'auto', fontSize: 13, color: 'var(--text-2)' }}>Choose a conversation</div> : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <strong>{thread.customer}</strong>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{CHANNEL[thread.channel] || thread.channel}{thread.phone ? ` · ${thread.phone}` : ''}{thread.product ? ` · ${thread.product}` : ''}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {canManage && <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={block}><Ban size={14} /> {thread.blocked ? 'Unblock' : 'Block'}</button>}
                                    <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={() => setReporting(true)}><Flag size={14} /> Report</button>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, background: 'var(--bg-2)' }}>
                                {thread.messages.map(m => (
                                    <div key={m.id} style={{ alignSelf: m.from === 'seller' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                                        <div style={{ padding: '9px 13px', borderRadius: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13.5,
                                            background: m.from === 'seller' ? 'var(--primary, #06A3DA)' : 'var(--bg)', color: m.from === 'seller' ? '#fff' : 'var(--text)', border: m.from === 'seller' ? 0 : '1px solid var(--border)' }}>{m.text}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, textAlign: m.from === 'seller' ? 'right' : 'left' }}>
                                            {m.time}{m.flag ? ` · ${FLAG[m.flag] || m.flag}` : ''}
                                        </div>
                                    </div>
                                ))}
                                <div ref={end} />
                            </div>
                            <form onSubmit={reply} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border)' }}>
                                <textarea style={{ ...field, minHeight: 44, height: 44, resize: 'vertical' }} value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Reply"
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(e); } }} />
                                <button className="btn btn-primary" disabled={busy || !text.trim()}><Send size={15} /></button>
                            </form>
                        </>
                    )}
                </div>
            </div>
            {reporting && thread && <ReportCustomer chat={thread} onClose={() => setReporting(false)} />}
        </>
    );
}
