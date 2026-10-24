import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** The merchant's pay-by-code QR: customers scan it in the PayPort app or on the web, or type the code. */
export default function MerchantQr({ code, name }) {
    const [src, setSrc] = useState('');
    useEffect(() => {
        if (!code) return;
        QRCode.toDataURL(`PAYPORT-MERCHANT:${code}`, { width: 480, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => setSrc(''));
    }, [code]);
    if (!code || !src) return null;
    return (
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
            <img src={src} alt={`QR code for merchant ${code}`} style={{ width: 140, height: 140, borderRadius: 10, background: '#fff' }} />
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Scan to pay{name ? ` ${name}` : ''}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 800, letterSpacing: 4, color: 'var(--text)', margin: '4px 0 12px' }}>{code}</div>
                <a href={src} download={`payport-merchant-${code}.png`} className="btn btn-ghost" style={{ display: 'inline-block', padding: '8px 14px', fontSize: 13 }}>Download QR</a>
            </div>
        </div>
    );
}
