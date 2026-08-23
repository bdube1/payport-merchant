import { useState, useEffect } from 'react';
import { Key, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiKeysApi } from '../lib/api';

export default function ApiKeys() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiKeysApi.list()
            .then(res => setKeys(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    }, []);

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

    return (
        <div style={{ padding: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>API Keys</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 24 }}>
                Use your secret key to create checkout sessions from your own server. Secret keys are only ever
                shown once, at the moment they're created — this page shows public keys only.
            </p>

            <div style={{ background: 'var(--badge-amber)', color: '#92600A', padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20 }}>
                Self-service key rotation isn't available yet — contact Payport support if you need a new key.
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
                ) : keys.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No API keys yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Public key</th><th>Environment</th><th>Label</th><th>Last used</th><th>Status</th><th></th></tr>
                        </thead>
                        <tbody>
                            {keys.map(k => (
                                <tr key={k.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Key size={13} color="var(--text-faint)" /> {k.publicKey}
                                    </td>
                                    <td><span className={`badge ${k.environment === 'LIVE' ? 'badge-green' : 'badge-amber'}`}>{k.environment}</span></td>
                                    <td style={{ color: 'var(--text-2)' }}>{k.label || '—'}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</td>
                                    <td><span className={`badge ${k.revoked ? 'badge-red' : 'badge-green'}`}>{k.revoked ? 'Revoked' : 'Active'}</span></td>
                                    <td>
                                        <button onClick={() => copy(k.publicKey)} className="btn btn-ghost" style={{ padding: 6 }}>
                                            <Copy size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
