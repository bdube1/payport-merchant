import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Page, Section, Table, Notice, useLoad, Badge, minor, show } from './kit';

const box = { padding: '8px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };
const err = (e, f) => e?.response?.data?.message || e?.response?.data?.error?.message || f;

function useQr(payload) {
    const [src, setSrc] = useState('');
    useEffect(() => {
        if (!payload) { setSrc(''); return; }
        QRCode.toDataURL(payload, { width: 600, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => setSrc(''));
    }, [payload]);
    return src;
}

function printQr(src, title, code, sub) {
    const w = window.open('', '_blank', 'width=640,height=820');
    if (!w) { toast.error('Allow pop-ups to print'); return; }
    const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    w.document.write(`<!doctype html><html><head><title>Payport QR ${esc(code)}</title><style>
        body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#091E3E}
        h1{font-size:28px;margin:0 0 6px} p{margin:4px 0;color:#5a7a91} img{width:380px;height:380px;margin:24px 0}
        .code{font-family:monospace;font-size:40px;font-weight:800;letter-spacing:6px;color:#091E3E}
        .brand{margin-top:28px;font-weight:800;color:#06A3DA;font-size:22px}</style></head><body>
        <h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}<img src="${src}" alt="QR"/>
        <p>Scan with the Payport app or enter the code</p><div class="code">${esc(code)}</div><div class="brand">Payport</div>
        <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
}

function CodeCard({ c, owner, onNewQr }) {
    const src = useQr(c.qrPayload);
    const [busy, setBusy] = useState(false);
    const title = c.primary ? owner : `${owner} – ${c.label}`;
    return (
        <div className="card" style={{ padding: 18, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            {src ? <img src={src} alt={`QR for ${c.code}`} style={{ width: 150, height: 150, borderRadius: 10, background: '#fff' }} /> : <div style={{ width: 150, height: 150 }} />}
            <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.primary ? 'Main code' : c.label}</span>
                    <Badge value={c.status} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 800, letterSpacing: 5, margin: '4px 0' }}>{c.code}</div>
                {c.address && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.address}</div>}
                {c.qrIssuedAt && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>QR issued {show(c.qrIssuedAt)}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" disabled={!src} onClick={() => printQr(src, title, c.code, c.address)} style={{ padding: '7px 14px', fontSize: 13 }}>Print</button>
                    <a className="btn btn-ghost" href={src || undefined} download={`payport-qr-${c.code}.png`} style={{ padding: '7px 14px', fontSize: 13, textDecoration: 'none' }}>Download</a>
                    <button className="btn btn-ghost" disabled={busy} style={{ padding: '7px 14px', fontSize: 13 }} onClick={async () => {
                        if (!window.confirm('Generate a new QR code? The current QR code will stop working; the code stays the same.')) return;
                        setBusy(true);
                        try { await onNewQr(c.code); toast.success('New QR code ready'); } catch (e) { toast.error(err(e, 'Could not create a new QR code')); }
                        finally { setBusy(false); }
                    }}>{busy ? '…' : 'Generate new QR'}</button>
                </div>
            </div>
        </div>
    );
}

/**
 * Codes & QR for a merchant or an agent: every code with its printable static QR (a new QR replaces the old one and
 * keeps the code), applying for more codes (branches), and the report per code with Excel/PDF export.
 */
export default function CodesQr({ word, owner, api }) {
    const d = useLoad(() => api.list());
    const codes = d.value?.codes || [];
    const [label, setLabel] = useState('');
    const [address, setAddress] = useState('');
    const [sending, setSending] = useState(false);
    const [rep, setRep] = useState({ code: '', from: monthAgo(), to: today() });
    const [run, setRun] = useState({ code: '', from: monthAgo(), to: today() });
    const report = useLoad(() => api.report(run), [JSON.stringify(run)]);
    const r = report.value;
    const agent = word === 'Agent';

    return (
        <Page title="Codes & QR">
            {d.error && <Notice kind="error">{d.error}</Notice>}
            <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
                {codes.map(c => <CodeCard key={c.code} c={c} owner={owner} onNewQr={async (code) => { await api.newQr(code); d.reload(); }} />)}
            </div>

            <Section title="Apply for another code">
                <form onSubmit={async e => {
                    e.preventDefault();
                    setSending(true);
                    try { await api.request(label.trim(), address.trim() || null); toast.success('Application sent'); setLabel(''); setAddress(''); d.reload(); }
                    catch (ex) { toast.error(err(ex, 'Could not send the application')); }
                    finally { setSending(false); }
                }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input required value={label} onChange={e => setLabel(e.target.value)} maxLength={80} placeholder="Branch name" style={{ ...box, minWidth: 200 }} />
                    <input value={address} onChange={e => setAddress(e.target.value)} maxLength={300} placeholder="Branch address" style={{ ...box, minWidth: 280, flex: 1 }} />
                    <button className="btn btn-primary" disabled={sending || !label.trim()} style={{ padding: '8px 16px', fontSize: 13 }}>{sending ? '…' : 'Apply'}</button>
                </form>
                {(d.value?.requests || []).length > 0 && <div style={{ marginTop: 14 }}>
                    <Table noExport rows={d.value.requests} columns={[
                        { key: 'requested_at', label: 'Applied', render: x => show(x.requested_at) }, { key: 'label', label: 'Branch' }, { key: 'address', label: 'Address' },
                        { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> }, { key: 'code', label: 'Code' }, { key: 'note', label: 'Note' },
                    ]} />
                </div>}
            </Section>

            <Section title="Report by code" right={<form onSubmit={e => { e.preventDefault(); setRun({ ...rep }); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select value={rep.code} onChange={e => setRep(v => ({ ...v, code: e.target.value }))} style={box}>
                    <option value="">All codes</option>
                    {codes.map(c => <option key={c.code} value={c.code}>{c.code} {c.primary ? '(main)' : `– ${c.label}`}</option>)}
                </select>
                <input type="date" value={rep.from} onChange={e => setRep(v => ({ ...v, from: e.target.value }))} style={box} />
                <input type="date" value={rep.to} onChange={e => setRep(v => ({ ...v, to: e.target.value }))} style={box} />
                <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>Run</button></form>}>
                {report.error && <Notice kind="error">{report.error}</Notice>}
                {r && <>
                    <Table exportName={`${word} codes summary ${r.from} to ${r.to}`} rows={r.summary} empty="Nothing in this period." columns={[
                        { key: 'code', label: 'Code' }, { key: 'label', label: 'Branch' }, ...(agent ? [{ key: 'kind', label: 'Type' }] : []),
                        { key: 'currency', label: 'Currency' }, { key: 'count', label: 'Count' },
                        { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                        agent ? { key: 'commission_minor', label: 'Commission', render: x => minor(x.commission_minor, x.currency) }
                            : { key: 'fee_minor', label: 'Fees', render: x => minor(x.fee_minor, x.currency) },
                    ]} />
                    <div style={{ height: 14 }} />
                    <Table exportName={`${word} code transactions ${r.from} to ${r.to}`} rows={r.rows} empty="No transactions in this period." columns={agent ? [
                        { key: 'created_at', label: 'Date', render: x => show(x.created_at) }, { key: 'code', label: 'Code' }, { key: 'label', label: 'Branch' },
                        { key: 'kind', label: 'Type', render: x => <Badge value={x.kind} /> }, { key: 'wallet_ref', label: 'Wallet' },
                        { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                        { key: 'commission_minor', label: 'Commission', render: x => minor(x.commission_minor, x.currency) }, { key: 'reference', label: 'Reference' },
                    ] : [
                        { key: 'created_at', label: 'Date', render: x => show(x.created_at) }, { key: 'code', label: 'Code' }, { key: 'label', label: 'Branch' },
                        { key: 'reference', label: 'Reference' }, { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> }, { key: 'channel', label: 'Channel' },
                        { key: 'amount_minor', label: 'Amount', render: x => minor(x.amount_minor, x.currency) },
                        { key: 'fee_minor', label: 'Fee', render: x => minor(x.fee_minor, x.currency) }, { key: 'net_minor', label: 'Net', render: x => minor(x.net_minor, x.currency) },
                    ]} />
                </>}
            </Section>
        </Page>
    );
}

/** The main code and its QR, for the dashboards. */
export function MainCode({ api, owner }) {
    const d = useLoad(() => api.list());
    const c = (d.value?.codes || [])[0];
    const src = useQr(c?.qrPayload);
    if (!c) return null;
    return (
        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
            {src && <img src={src} alt={`QR for ${c.code}`} style={{ width: 120, height: 120, borderRadius: 10, background: '#fff' }} />}
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{owner ? `${owner} · ` : ''}Main code{(d.value?.codes || []).length > 1 ? ` (+${d.value.codes.length - 1} more)` : ''}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 800, letterSpacing: 4, margin: '2px 0 10px' }}>{c.code}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" disabled={!src} onClick={() => printQr(src, owner, c.code, c.address)} style={{ padding: '7px 14px', fontSize: 13 }}>Print QR</button>
                    <a className="btn btn-ghost" href={src || undefined} download={`payport-qr-${c.code}.png`} style={{ padding: '7px 14px', fontSize: 13, textDecoration: 'none' }}>Download</a>
                </div>
            </div>
        </div>
    );
}
