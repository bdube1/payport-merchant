import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Copy, QrCode, MessageCircle, Mail } from 'lucide-react';

/** Share a store, product or link: WhatsApp, Facebook, X, email, copy and a QR code to download or print. */
export default function Share({ url, text, compact }) {
    const [qr, setQr] = useState('');
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open) return;
        QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
    }, [open, url]);
    const enc = encodeURIComponent;
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); toast.success('Copied'); } catch { toast.error('Copy failed'); }
    };
    const b = { padding: compact ? '5px 9px' : '7px 12px', fontSize: 12.5 };
    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <a className="btn btn-ghost" style={b} href={`https://wa.me/?text=${enc(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
            {!compact && <a className="btn btn-ghost" style={b} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>}
            {!compact && <a className="btn btn-ghost" style={b} href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`} target="_blank" rel="noopener noreferrer">X</a>}
            {!compact && <a className="btn btn-ghost" style={b} href={`mailto:?subject=${enc(text)}&body=${enc(`${text}\n${url}`)}`}><Mail size={14} /> Email</a>}
            <button type="button" className="btn btn-ghost" style={b} onClick={copy}><Copy size={14} /> Copy</button>
            <button type="button" className="btn btn-ghost" style={b} onClick={() => setOpen(true)}><QrCode size={14} /> QR</button>
            {open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setOpen(false)}>
                    <div className="card" style={{ padding: 24, textAlign: 'center', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight: 800, marginBottom: 12 }}>{text}</div>
                        {qr && <img src={qr} alt="QR code" style={{ width: 260, height: 260, background: '#fff', borderRadius: 8 }} />}
                        <div style={{ fontSize: 12, color: 'var(--text-2)', wordBreak: 'break-all', margin: '10px 0' }}>{url}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {qr && <a className="btn btn-primary" href={qr} download="payport-qr.png">Download</a>}
                            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
