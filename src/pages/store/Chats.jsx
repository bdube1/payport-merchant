import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Flag, Ban, ShieldAlert, Paperclip, Mic, Square } from 'lucide-react';
import { Section, Notice } from '../../components/kit';
import { storeApi, storeUrl } from '../../lib/commerce';
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

const EMOJIS = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤗 🤔 😐 😏 🙄 😬 😌 😔 😴 😷 😎 🤓 😕 😮 😳 🥺 😢 😭 😱 😤 😡 👍 👎 👌 ✌️ 🤞 👏 🙌 🙏 💪 👋 🤝 ❤️ 💚 💙 💯 ✅ ❌ ⭐ 🔥 🎉 🎁 📦 🚚 🛒 💰 💵 💳 📱 📍 ⏰ 📅 🍔 🍕 🥤 ☕ 👗 👟 👜 💄 🏠 🚗'.split(' ');
const PICKS = [
    ['🖼️ Photos & videos', 'image/jpeg,image/png,video/mp4,video/quicktime,video/webm'],
    ['📄 Document', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'],
    ['🎵 Audio', 'audio/*'],
];
const WA = { out: 'var(--wa-out, #d9fdd3)', in: 'var(--bg)', bg: 'var(--wa-bg, #efeae2)', green: '#00a884' };

function Avatar({ src, name, size = 40 }) {
    const url = storeUrl(src);
    const box = { width: size, height: size, borderRadius: '50%', flex: 'none', objectFit: 'cover' };
    if (url) return <img src={url} alt="" style={box} />;
    return <span style={{ ...box, display: 'grid', placeItems: 'center', background: '#6a7f8a', color: '#fff', fontWeight: 700 }}>{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}

function Body({ m }) {
    const url = storeUrl(m.file?.url);
    const media = { maxWidth: '100%', maxHeight: 300, borderRadius: 6, display: 'block' };
    const box = { display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,0,0,.06)', borderRadius: 6, padding: 10, color: 'inherit', textDecoration: 'none', minWidth: 200 };
    return (
        <>
            {m.kind === 'IMAGE' && url && <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Photo" style={media} /></a>}
            {m.kind === 'VIDEO' && url && <video src={url} controls preload="metadata" style={media} />}
            {m.kind === 'AUDIO' && url && <audio src={url} controls preload="metadata" style={{ maxWidth: 260 }} />}
            {m.kind === 'DOCUMENT' && url && <a href={url} style={box}><span style={{ fontSize: 26 }}>📄</span><span>{m.file.name}</span></a>}
            {m.kind === 'CONTACT' && m.contact && <span style={box}><span style={{ fontSize: 26 }}>👤</span><span><b>{m.contact.name}</b><br />{m.contact.phone}</span></span>}
            {(m.kind === 'TEXT' || !m.kind || (m.kind !== 'CONTACT' && m.file && m.text !== m.file.name)) && <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>}
        </>
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
    const [search, setSearch] = useState('');
    const [popup, setPopup] = useState('');          // '', 'emoji', 'attach', 'contact'
    const [contact, setContact] = useState({ name: '', phone: '' });
    const [dragging, setDragging] = useState(false);
    const [recording, setRecording] = useState(null);
    const [mine, setMine] = useState(null);
    const end = useRef(null);
    const fileRef = useRef(null);
    const avatarRef = useRef(null);
    const textRef = useRef(null);

    const loadList = () => storeApi.chats().then(r => { setList(data(r)?.chats || []); setError(''); }).catch(e => setError(errorMessage(e, 'Could not load chats')));
    const loadThread = (id) => storeApi.chat(id).then(r => setThread(data(r))).catch(() => {});
    useEffect(() => { loadList(); storeApi.chatAvatar().then(r => setMine(data(r)?.avatar || null)).catch(() => {}); const t = setInterval(loadList, 8000); return () => clearInterval(t); }, []);
    useEffect(() => {
        if (!open) return undefined;
        loadThread(open);
        const t = setInterval(() => loadThread(open), 4000);
        return () => clearInterval(t);
    }, [open]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages?.length]);

    const reply = async (e) => {
        e?.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true);
        try { setThread(data(await storeApi.chatReply(open, text))); setText(''); loadList(); }
        catch (err) { toast.error(errorMessage(err, 'Not sent')); }
        finally { setBusy(false); }
    };
    const sendFiles = async (files, voice) => {
        for (const f of Array.from(files || []).slice(0, 10)) {
            try { setThread(data(await storeApi.chatFile(open, f, voice))); }
            catch (err) { toast.error(errorMessage(err, `${f.name || 'File'} not sent`)); }
        }
        loadList();
    };
    const sendContact = async () => {
        try { setThread(data(await storeApi.chatContact(open, contact.name, contact.phone))); setContact({ name: '', phone: '' }); setPopup(''); loadList(); }
        catch (err) { toast.error(errorMessage(err, 'Contact not sent')); }
    };
    const block = async () => {
        if (!window.confirm('Are you sure?')) return;
        try { setThread(data(await storeApi.chatBlock(open, !thread.blocked))); loadList(); }
        catch (err) { toast.error(errorMessage(err, 'Could not change')); }
    };
    const voice = async () => {
        if (recording) { recording.stop(); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream);
            const chunks = [];
            rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
            rec.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                setRecording(null);
                const type = rec.mimeType || 'audio/webm';
                const blob = new Blob(chunks, { type });
                if (blob.size) sendFiles([new File([blob], `voice.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`, { type })], true);
            };
            rec.start();
            setRecording(rec);
        } catch { toast.error('Allow the microphone to send a voice message'); }
    };
    const changeAvatar = async (f) => {
        if (!f) return;
        try { setMine(data(await storeApi.setChatAvatar(f))?.avatar || null); toast.success('Profile picture changed'); }
        catch (err) { toast.error(errorMessage(err, 'Not saved')); }
    };
    const addEmoji = (em) => {
        const el = textRef.current;
        const at = el ? el.selectionStart : text.length;
        setText(text.slice(0, at) + em + text.slice(el ? el.selectionEnd : at));
        el?.focus();
    };

    const shown = (list || []).filter(c => !search.trim() || `${c.customer} ${c.product || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
    const popBox = { position: 'absolute', bottom: 64, left: 12, background: 'var(--bg)', borderRadius: 12, boxShadow: '0 4px 18px rgba(0,0,0,.2)', padding: 10, zIndex: 5 };
    const icon = { background: 'none', border: 0, cursor: 'pointer', fontSize: 22, width: 40, height: 40, borderRadius: '50%', color: 'var(--text-2)', display: 'grid', placeItems: 'center' };

    return (
        <>
            {error && <Notice kind="error">{error}</Notice>}
            <WhatCustomersAsk />
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', height: 'min(78vh, 760px)', overflow: 'hidden', padding: 0 }}>
                <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-2)' }}>
                        <button type="button" onClick={() => canManage && avatarRef.current?.click()} title={canManage ? 'Change the store\'s profile picture' : ''} style={{ border: 0, padding: 0, background: 'none', cursor: canManage ? 'pointer' : 'default' }}>
                            <Avatar src={mine} name="Store" />
                        </button>
                        <input ref={avatarRef} type="file" accept="image/jpeg,image/png" hidden onChange={e => { changeAvatar(e.target.files[0]); e.target.value = ''; }} />
                        <strong style={{ flex: 1, fontSize: 18 }}>Chats</strong>
                    </div>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <input style={{ ...field, padding: '8px 12px' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {list && list.length === 0 && <div style={{ padding: 18, fontSize: 13, color: 'var(--text-2)' }}>No conversations yet.</div>}
                        {shown.map(c => (
                            <button key={c.id} onClick={() => { setOpen(c.id); setPopup(''); }} style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 14px', border: 0,
                                borderBottom: '1px solid var(--border)', background: open === c.id ? 'var(--bg-2)' : 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                                <Avatar src={c.avatar} name={c.customer} size={46} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <strong style={{ fontSize: 14 }}>{c.customer}</strong>
                                        <span style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{String(c.lastAt || '').replace('T', ' ').slice(11, 16)}</span>
                                    </span>
                                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {c.flagged && <ShieldAlert size={12} style={{ verticalAlign: -2, color: 'var(--red)', marginRight: 4 }} />}{c.preview}
                                        </span>
                                        {c.unread > 0 && <span style={{ background: WA.green, color: '#fff', borderRadius: 99, minWidth: 20, height: 20, fontSize: 11.5, display: 'grid', placeItems: 'center', padding: '0 6px' }}>{c.unread}</span>}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative', background: WA.bg }}
                    onDragOver={e => { if (thread) { e.preventDefault(); setDragging(true); } }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
                    onDrop={e => { e.preventDefault(); setDragging(false); if (thread) sendFiles(e.dataTransfer.files); }}>
                    {!thread ? <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-2)' }}><div style={{ fontSize: 26, color: 'var(--text)' }}>Payport Messages</div><div style={{ fontSize: 13 }}>Choose a conversation</div></div> : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--bg-2)' }}>
                                <Avatar src={thread.avatar} name={thread.customer} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <strong>{thread.customer}</strong>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{CHANNEL[thread.channel] || thread.channel}{thread.phone ? ` · ${thread.phone}` : ''}{thread.product ? ` · ${thread.product}` : ''}</div>
                                </div>
                                {canManage && <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={block}><Ban size={14} /> {thread.blocked ? 'Unblock' : 'Block'}</button>}
                                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={() => setReporting(true)}><Flag size={14} /> Report</button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 6%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ alignSelf: 'center', background: '#ffeecd', color: '#54656f', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, marginBottom: 8 }}>🔒 Messages are encrypted. Customers pay only through Payport.</div>
                                {thread.messages.map(m => (
                                    <div key={m.id} style={{ alignSelf: m.from === 'seller' ? 'flex-end' : 'flex-start', maxWidth: '65%', padding: '6px 8px 4px', borderRadius: 8, fontSize: 14,
                                        background: m.from === 'seller' ? WA.out : WA.in, color: 'var(--text)', boxShadow: '0 1px .5px rgba(11,20,26,.13)', display: 'flex', flexDirection: 'column', gap: 4, overflowWrap: 'anywhere' }}>
                                        <Body m={m} />
                                        <span style={{ alignSelf: 'flex-end', fontSize: 11, color: 'var(--text-2)' }}>{String(m.time).slice(11)}{m.flag ? ` · ${FLAG[m.flag] || m.flag}` : ''}</span>
                                    </div>
                                ))}
                                <div ref={end} />
                            </div>
                            {popup === 'emoji' && <div style={{ ...popBox, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, width: 'min(420px, calc(100% - 24px))', maxHeight: 240, overflowY: 'auto' }}>
                                {EMOJIS.map(e => <button key={e} type="button" onClick={() => addEmoji(e)} style={{ border: 0, background: 'none', fontSize: 22, cursor: 'pointer', padding: 4 }}>{e}</button>)}
                            </div>}
                            {popup === 'attach' && <div style={{ ...popBox, left: 56, display: 'grid', minWidth: 200 }}>
                                {PICKS.map(([l, accept]) => <button key={l} type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { fileRef.current.accept = accept; fileRef.current.click(); setPopup(''); }}>{l}</button>)}
                                <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setPopup('contact')}>👤 Contact</button>
                            </div>}
                            {popup === 'contact' && <div style={{ ...popBox, left: 56, display: 'grid', gap: 8, width: 260 }}>
                                <input style={field} maxLength={60} placeholder="Contact name" value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} />
                                <input style={field} maxLength={20} placeholder="Phone number" value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} />
                                <button type="button" className="btn btn-primary" onClick={sendContact}>Send contact</button>
                            </div>}
                            <input ref={fileRef} type="file" hidden multiple onChange={e => { sendFiles(e.target.files); e.target.value = ''; }} />
                            <form onSubmit={reply} style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '8px 12px', background: 'var(--bg-2)' }}>
                                <button type="button" style={icon} aria-label="Emoji" onClick={() => setPopup(popup === 'emoji' ? '' : 'emoji')}>😊</button>
                                <button type="button" style={icon} aria-label="Attach" onClick={() => setPopup(popup === 'attach' ? '' : 'attach')}><Paperclip size={20} /></button>
                                <textarea ref={textRef} style={{ ...field, flex: 1, minHeight: 42, height: 42, resize: 'none', background: 'var(--bg)' }} value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Type a message"
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(); } }}
                                    onPaste={e => { if (e.clipboardData?.files?.length) { e.preventDefault(); sendFiles(e.clipboardData.files); } }} />
                                {text.trim()
                                    ? <button className="btn" style={{ ...icon, background: WA.green, color: '#fff' }} disabled={busy} aria-label="Send"><Send size={18} /></button>
                                    : <button type="button" className="btn" style={{ ...icon, background: recording ? '#e53935' : WA.green, color: '#fff' }} onClick={voice} aria-label={recording ? 'Stop and send' : 'Record a voice message'}>{recording ? <Square size={16} /> : <Mic size={18} />}</button>}
                            </form>
                            {dragging && <div style={{ position: 'absolute', inset: '60px 0 0 0', background: 'rgba(0,168,132,.12)', border: `3px dashed ${WA.green}`, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700, color: WA.green, pointerEvents: 'none' }}>Drop files to send</div>}
                        </>
                    )}
                </div>
            </div>
            {reporting && thread && <ReportCustomer chat={thread} onClose={() => setReporting(false)} />}
        </>
    );
}
