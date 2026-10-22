import { useState } from 'react';
import { balanceApi } from '../lib/api';
import { Page, Section, Table, Notice, useLoad, minor } from '../components/kit';

function csv(rows) {
    if (!rows?.length) return '';
    const keys = Object.keys(rows[0]);
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

export default function Balances() {
    const [mode, setMode] = useState('live');
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const [q, setQ] = useState({ currency: 'USD', from: monthAgo, to: today });
    const balances = useLoad(() => balanceApi.balances(mode), [mode]);
    const statement = useLoad(() => balanceApi.statement(q.currency, q.from, q.to, mode), [mode, q.currency, q.from, q.to]);
    const download = () => {
        const url = URL.createObjectURL(new Blob([csv(statement.value?.lines)], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = `statement-${q.currency}-${q.from}-${q.to}.csv`; a.click(); URL.revokeObjectURL(url);
    };
    return (
        <Page title="Balances and statement" subtitle={`Funds are held for ${balances.value?.holdHours ?? 24} hours, then become available for the next settlement.`}
              actions={<select value={mode} onChange={e => setMode(e.target.value)}><option value="live">Live</option><option value="test">Test</option></select>}>
            {balances.error && <Notice kind="error">{balances.error}</Notice>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 18 }}>
                {(balances.value?.balances || []).map(b => (
                    <div key={b.currency} className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>{b.currency}</div>
                        {[['Pending (on hold)', b.pendingMinor], ['Available', b.availableMinor], ['In settlement', b.inSettlementMinor], ['Paid out', b.paidOutMinor]].map(([l, v]) => (
                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}><span style={{ color: 'var(--text-2)' }}>{l}</span><strong>{minor(v)}</strong></div>
                        ))}
                    </div>
                ))}
            </div>
            <Section title="Statement" right={<>
                <input value={q.currency} onChange={e => setQ(s => ({ ...s, currency: e.target.value.toUpperCase() }))} style={{ width: 80 }} />
                <input type="date" value={q.from} onChange={e => setQ(s => ({ ...s, from: e.target.value }))} />
                <input type="date" value={q.to} onChange={e => setQ(s => ({ ...s, to: e.target.value }))} />
                <button className="btn btn-ghost" onClick={download} disabled={!statement.value?.lines?.length}>CSV</button>
            </>}>
                {statement.error && <Notice kind="error">{statement.error}</Notice>}
                <Table rows={statement.value?.lines} empty="No movements in this period." columns={[
                    { key: 'grossMinor', label: 'Gross', render: r => minor(r.grossMinor) }, { key: 'feeMinor', label: 'Fee', render: r => minor(r.feeMinor) },
                    { key: 'netMinor', label: 'Net', render: r => minor(r.netMinor) }, { key: 'runningNetMinor', label: 'Running', render: r => minor(r.runningNetMinor) },
                ]} />
                {statement.value && <p style={{ fontSize: 13, marginBottom: 0 }}>Net change: <strong>{minor(statement.value.netChangeMinor, q.currency)}</strong></p>}
            </Section>
        </Page>
    );
}
