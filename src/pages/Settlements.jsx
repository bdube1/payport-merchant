import { useState, useEffect } from 'react';
import { Landmark } from 'lucide-react';
import { settlementsApi, formatAmount } from '../lib/api';

const STATUS_BADGE = {
    PENDING: 'badge-amber',
    PROCESSING: 'badge-amber',
    PAID: 'badge-green',
};

export default function Settlements() {
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        settlementsApi.list()
            .then(res => setSettlements(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Landmark size={20} /> Settlements
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 28 }}>
                Payout batches, run daily. Once a session appears in a settlement here, it's no longer counted in your running Dashboard balance.
            </p>

            {loading ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : settlements.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>
                    <Landmark size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p>No settlements yet — your first weekly batch will appear here once you have paid transactions.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table>
                        <thead>
                            <tr><th>Period</th><th>Currency</th><th>Transactions</th><th>Gross</th><th>Commission</th><th>Refunds</th><th>Net paid out</th><th>Status</th><th>Reference</th></tr>
                        </thead>
                        <tbody>
                            {settlements.map(s => (
                                <tr key={s.id}>
                                    <td style={{ color: 'var(--text-2)' }}>
                                        {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                                    </td>
                                    <td>{s.currency}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{s.sessionCount}</td>
                                    <td>{formatAmount(s.grossAmountCents, s.currency)}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{formatAmount(s.commissionAmountCents, s.currency)}</td>
                                    <td style={{ color: 'var(--text-2)' }}>{s.refundAmountCents > 0 ? formatAmount(s.refundAmountCents, s.currency) : '—'}</td>
                                    <td style={{ fontWeight: 700 }}>{formatAmount(s.netAmountCents, s.currency)}</td>
                                    <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{s.payoutReference || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
