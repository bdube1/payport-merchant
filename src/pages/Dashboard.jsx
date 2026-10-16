import { useState, useEffect } from 'react';
import { Wallet, Receipt, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { checkoutSessionsApi, balanceApi, reportsApi, formatAmount, getCurrentUser } from '../lib/api';

const STATUS_BADGE = {
    PAID: 'badge-green',
    FAILED: 'badge-red',
    EXPIRED: 'badge-gray',
    CANCELLED: 'badge-gray',
    PENDING: 'badge-amber',
    CREATED: 'badge-gray',
};

export default function Dashboard() {
    const [balance, setBalance] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = getCurrentUser();

    useEffect(() => {
        Promise.all([
            balanceApi.balances('live'),
            checkoutSessionsApi.list(),
            reportsApi.trends(30),
        ]).then(([balRes, sessRes, trendsRes]) => {
            setBalance(balRes.data?.data || balRes.data);
            setSessions((sessRes.data?.data || sessRes.data || []).slice(0, 8));
            const t = (trendsRes.data?.data || trendsRes.data || []).map(d => ({
                date: d.date.slice(5),
                amount: (d.grossCents || 0) / 100,
                count: d.count,
            }));
            setTrends(t);
        }).finally(() => setLoading(false));
    }, []);

    const currencies = Object.fromEntries((balance?.balances || []).map(b => [b.currency, b]));
    const hasAnyBalance = Object.keys(currencies).length > 0;

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Dashboard</h1>
                {user?.merchantStatus && (
                    <span className={`badge ${user.merchantStatus === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                        {user.merchantStatus}
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 10 }}>
                {hasAnyBalance ? (
                    Object.entries(currencies).map(([currency, t]) => (
                        <div key={currency} className="card" style={{ padding: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>
                                <Wallet size={14} /> {currency} — AVAILABLE
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>{formatAmount(t.availableMinor, currency)}</div>
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-2)' }}>
                                <span>On hold: {formatAmount(t.pendingMinor, currency)}</span>
                                <span>In settlement: {formatAmount(t.inSettlementMinor, currency)}</span>
                                <span>Paid out: {formatAmount(t.paidOutMinor, currency)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ padding: 22 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                            <Wallet size={14} /> BALANCE
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-faint)' }}>No paid transactions yet</div>
                    </div>
                )}
            </div>

            {balance?.holdHours !== undefined && (
                <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 28, lineHeight: 1.5 }}>
                    Payments are held for {balance.holdHours} hours before they become available. Details under Balances; payouts under Payouts.
                </p>
            )}

            <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} /> Collections — last 30 days
                </h2>
                {trends.every(t => t.amount === 0) ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No paid collections in this period yet.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                            <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                            <Line type="monotone" dataKey="amount" stroke="var(--blue)" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Receipt size={16} /> Recent transactions
                    </h2>
                    <Link to="/transactions" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        View all <ArrowUpRight size={13} />
                    </Link>
                </div>

                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
                ) : sessions.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>No transactions yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Reference</th><th>Amount</th><th>Status</th><th>Created</th></tr>
                        </thead>
                        <tbody>
                            {sessions.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{s.reference}</td>
                                    <td style={{ fontWeight: 700 }}>{formatAmount(s.amountCents, s.currency)}</td>
                                    <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                                    <td style={{ color: 'var(--text-2)' }}>{new Date(s.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
