import { useState, useEffect } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { reportsApi, formatAmount, METHOD_LABELS } from '../lib/api';

const COLORS = ['#06A3DA', '#34AD54', '#F59E0B', '#8B5CF6', '#E53E3E'];

export default function Reports() {
    const [breakdown, setBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        reportsApi.collectionsByMethod()
            .then(res => setBreakdown(res.data?.data || res.data || []))
            .finally(() => setLoading(false));
    }, []);

    const byCurrency = breakdown.reduce((acc, row) => {
        (acc[row.currency] ||= []).push(row);
        return acc;
    }, {});

    return (
        <div style={{ padding: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Reports</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 28 }}>How your customers are actually paying you.</p>

            {loading ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</div>
            ) : breakdown.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>
                    <PieIcon size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p>No paid transactions yet — nothing to break down.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {Object.entries(byCurrency).map(([currency, rows]) => {
                        const total = rows.reduce((sum, r) => sum + r.grossCents, 0);
                        const chartData = rows.map(r => ({
                            name: METHOD_LABELS[r.paymentMethodCode] || r.paymentMethodCode || 'Unknown',
                            value: r.grossCents,
                        }));
                        return (
                            <div key={currency} className="card" style={{ padding: 22 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{currency} collections by method</h2>
                                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>{formatAmount(total, currency)} total</p>

                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatAmount(v, currency)} />
                                        <Legend wrapperStyle={{ fontSize: 12.5 }} />
                                    </PieChart>
                                </ResponsiveContainer>

                                <table style={{ marginTop: 12 }}>
                                    <thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead>
                                    <tbody>
                                        {rows.sort((a, b) => b.grossCents - a.grossCents).map(r => (
                                            <tr key={r.paymentMethodCode}>
                                                <td>{METHOD_LABELS[r.paymentMethodCode] || r.paymentMethodCode || 'Unknown'}</td>
                                                <td style={{ color: 'var(--text-2)' }}>{r.count}</td>
                                                <td style={{ fontWeight: 700 }}>{formatAmount(r.grossCents, currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
