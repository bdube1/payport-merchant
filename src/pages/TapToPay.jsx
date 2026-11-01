import { useEffect, useRef, useState } from 'react';
import { Nfc } from 'lucide-react';
import toast from 'react-hot-toast';
import { tapApi, formatAmount, errorMessage } from '../lib/api';
import { CurrencySelect } from '../components/kit';

/**
 * Payport Tap, the merchant's side: enter the amount, then the customer taps their phone (Payport app, Tap to pay)
 * on this phone. Needs Chrome on an Android phone with NFC (Web NFC); other devices take Payport QR or a code.
 */
export default function TapToPay() {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [state, setState] = useState('idle');      // idle | waiting | charging | done
    const [result, setResult] = useState(null);
    const abort = useRef(null);
    const supported = typeof window !== 'undefined' && 'NDEFReader' in window;

    useEffect(() => () => abort.current?.abort(), []);

    const charge = async (payload) => {
        setState('charging');
        try {
            const r = (await tapApi.charge(payload, Math.round(Number(amount) * 100), currency)).data?.data;
            setResult(r);
            if (r?.result === 'PAID') toast.success('Paid');
            else toast.error(r?.message || 'The payment did not go through');
        } catch (e) {
            setResult({ result: 'FAILED', message: errorMessage(e, 'The payment did not go through') });
        } finally {
            setState('done');
        }
    };

    const start = async () => {
        const value = Number(amount);
        if (!(value > 0)) { toast.error('Enter the amount'); return; }
        if (!window.confirm(`Are you sure? Charge ${formatAmount(Math.round(value * 100), currency)} by tap.`)) return;
        setResult(null);
        try {
            const reader = new window.NDEFReader();
            abort.current?.abort();
            abort.current = new AbortController();
            await reader.scan({ signal: abort.current.signal });
            setState('waiting');
            reader.onreadingerror = () => toast.error('Could not read the phone. Ask the customer to tap again.');
            reader.onreading = (event) => {
                for (const rec of event.message.records) {
                    if (rec.recordType !== 'text' && rec.recordType !== 'url') continue;
                    const text = new TextDecoder(rec.encoding || 'utf-8').decode(rec.data);
                    if (text.startsWith('payport-tap:')) {
                        abort.current?.abort();
                        charge(text);
                        return;
                    }
                }
                toast.error('That is not a Payport tap');
            };
        } catch (e) {
            setState('idle');
            toast.error(e?.name === 'NotAllowedError' ? 'Allow NFC for this site to take tap payments' : 'NFC is not available on this device');
        }
    };

    const stop = () => { abort.current?.abort(); setState('idle'); };

    return (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, marginBottom: 6 }}>Tap to get paid</h1>
            {!supported && <div className="card" style={{ padding: 14, marginBottom: 14, fontSize: 13.5 }}>
                Open this page in Chrome on an Android phone with NFC turned on. On other devices, customers pay with your Payport QR or merchant code.
            </div>}
            <div className="card" style={{ padding: 20, display: 'grid', gap: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Amount</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <CurrencySelect value={currency} onChange={setCurrency} />
                    <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.00" disabled={state !== 'idle' && state !== 'done'}
                        style={{ flex: 1, fontSize: 24, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />
                </div>
                {(state === 'idle' || state === 'done') && <button className="btn btn-primary" disabled={!supported} onClick={start} style={{ padding: 14, fontSize: 16 }}><Nfc size={18} /> Ready for tap</button>}
                {state === 'waiting' && <>
                    <div style={{ textAlign: 'center', padding: 20 }}>
                        <Nfc size={56} style={{ color: 'var(--primary, #06A3DA)' }} />
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{formatAmount(Math.round(Number(amount) * 100), currency)}</div>
                        <div style={{ color: 'var(--text-2)' }}>Ask the customer to open Tap to pay in the Payport app and hold their phone to the back of this one.</div>
                    </div>
                    <button className="btn btn-ghost" onClick={stop}>Cancel</button>
                </>}
                {state === 'charging' && <div style={{ textAlign: 'center', padding: 20, fontWeight: 700 }}>Taking payment…</div>}
                {state === 'done' && result && (
                    <div style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: result.result === 'PAID' ? 'rgba(52,173,84,.12)' : 'rgba(220,38,38,.1)' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: result.result === 'PAID' ? 'var(--green)' : 'var(--red)' }}>{result.result === 'PAID' ? 'Payment successful' : 'Payment failed'}</div>
                        {result.result === 'PAID' && <div>{formatAmount(result.amountMinor, result.currency)} from {result.customer}</div>}
                        {result.message && result.result !== 'PAID' && <div style={{ marginTop: 4 }}>{result.message}</div>}
                        {result.reference && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>Ref {result.reference}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
