import { useState } from 'react';
import toast from 'react-hot-toast';
import { agentApi, errorMessage } from './agentApi';
import { Page, Section, Table, Notice, useLoad, Badge, minor, FormButton, KeyValues, show } from '../components/kit';

const sumBy = (rows, kind, field) => (rows || []).filter(r => !kind || r.kind === kind)
    .reduce((acc, r) => ({ ...acc, [r.currency]: (acc[r.currency] || 0) + Number(r[field] || 0) }), {});
const fmt = (m) => Object.keys(m || {}).length ? Object.entries(m).map(([c, v]) => minor(v, c)).join(' · ') : '—';
const count = (rows, kind) => (rows || []).filter(r => !kind || r.kind === kind).reduce((n, r) => n + Number(r.count || 0), 0);

function Card({ label, value, sub }) {
    return (
        <div className="card" style={{ padding: 16, minWidth: 180, flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

function StatusNotice({ agent }) {
    if (!agent) return null;
    if (agent.status === 'SUSPENDED') return <Notice kind="error">Your agent account is suspended. Contact PayPort.</Notice>;
    if (agent.status === 'PENDING') return <Notice kind="warn">Your application is being reviewed.</Notice>;
    return null;
}

const txColumns = [
    { key: 'created_at', label: 'When', render: r => show(r.created_at) },
    { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> },
    { key: 'wallet_ref', label: 'Customer wallet' },
    { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
    { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) },
    { key: 'op_ref', label: 'Reference' },
];

export function AgentDashboard() {
    const d = useLoad(() => agentApi.dashboard());
    const v = d.value || {};
    const a = v.agent;
    return (
        <Page title={a ? a.name : 'Dashboard'} actions={a && <Badge value={a.status} />}>
            {d.error && <Notice kind="error">{d.error}</Notice>}
            <StatusNotice agent={a} />
            {a && <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                    <Card label="Agent code" value={<span style={{ fontFamily: 'monospace' }}>{a.agent_code}</span>} sub={a.location} />
                    <Card label="E-float" value={fmt(a.float)} sub={v.pendingDeposits ? `${v.pendingDeposits} deposit(s) awaiting confirmation` : null} />
                    <Card label="Cash-in today" value={fmt(sumBy(v.today, 'CASH_IN', 'amount_minor'))} sub={`${count(v.today, 'CASH_IN')} customers`} />
                    <Card label="Cash-out today" value={fmt(sumBy(v.today, 'CASH_OUT', 'amount_minor'))} sub={`${count(v.today, 'CASH_OUT')} customers`} />
                    <Card label="Commission this month" value={fmt(Object.fromEntries((v.commissionThisMonth || []).map(r => [r.currency, Number(r.commission_minor)])))}
                        sub={`Last 30 days: ${fmt(sumBy(v.last30Days, null, 'commission_minor'))}`} />
                </div>
                <Section title="Last 30 days">
                    <Table rows={v.last30Days} empty="No operations in the last 30 days." columns={[
                        { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> }, { key: 'currency', label: 'Currency' },
                        { key: 'count', label: 'Operations' }, { key: 'amount_minor', label: 'Volume', render: r => minor(r.amount_minor, r.currency) },
                        { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) },
                    ]} />
                </Section>
                <Section title="Recent operations">
                    <Table rows={v.recent} empty="No operations yet." columns={txColumns} />
                </Section>
            </>}
        </Page>
    );
}

export function AgentServe() {
    const me = useLoad(() => agentApi.me());
    const a = me.value?.agent;
    const currencies = Object.keys(a?.float || {});
    const active = a?.status === 'ACTIVE';
    const [last, setLast] = useState(null);
    return (
        <Page title="Cash in & cash out">
            {me.error && <Notice kind="error">{me.error}</Notice>}
            <StatusNotice agent={a} />
            {last && <Notice kind="ok">{last}</Notice>}
            {a && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                {currencies.map(c => <Card key={c} label={`${c} e-float`} value={minor(a.float[c], c)} />)}
            </div>}
            {active && <>
                <Section title="Cash in" right={<FormButton label="Cash in" title="Cash in: the customer gives you cash" submitLabel="Send to wallet"
                    fields={[{ name: 'customer', label: 'Customer phone or wallet number', required: true },
                        { name: 'currency', label: 'Currency', type: 'select', options: currencies, required: true, initial: currencies[0] || '' },
                        { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true }]}
                    onSubmit={async v => {
                        const who = await agentApi.customer(v.customer.trim(), v.currency).then(r => r.data?.data).catch(e => { throw new Error(errorMessage(e, 'Customer not found')); });
                        if (!window.confirm(`Send ${v.currency} ${Number(v.amount).toFixed(2)} to ${who.name || who.wallet} (${who.wallet})?`)) throw new Error('Cancelled');
                        const r = await agentApi.cashIn(v.customer.trim(), v.currency, Math.round(Number(v.amount) * 100), `web-${Date.now()}`);
                        const d = r.data?.data || {};
                        setLast(`Cash-in done: ${minor(d.amountMinor, d.currency)} to ${d.wallet}. Commission ${minor(d.commissionMinor, d.currency)}. E-float now ${minor(d.floatMinor, d.currency)}.`);
                        return r;
                    }} onDone={me.reload} />}>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0 }}>Take the cash, then send the same amount from your e-float to the customer's PayPort wallet.</p>
                </Section>
                <Section title="Cash out" right={<FormButton label="Cash out" kind="ghost" title="Cash out: the customer receives cash" submitLabel="Redeem code"
                    fields={[{ name: 'customerPhone', label: 'Customer phone', required: true }, { name: 'code', label: 'Cash-out code', required: true }]}
                    onSubmit={async v => {
                        const r = await agentApi.cashOut(v.customerPhone.trim(), v.code.trim());
                        const d = r.data?.data || {};
                        setLast(`Pay out ${minor(d.amountMinor, d.currency)} in cash now. Commission ${minor(d.commissionMinor, d.currency)}. E-float now ${minor(d.floatMinor, d.currency)}.`);
                        toast.success('Code redeemed: pay out the cash');
                        return r;
                    }} onDone={me.reload} />}>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0 }}>The customer creates a one-time cash-out code in the PayPort app or on USSD. Pay out only after the code is accepted.</p>
                </Section>
            </>}
        </Page>
    );
}

export function AgentFloat() {
    const me = useLoad(() => agentApi.me());
    const deposits = useLoad(() => agentApi.deposits());
    const a = me.value?.agent;
    const currencies = Object.keys(a?.float || {});
    return (
        <Page title="Float" actions={a?.status === 'ACTIVE' && <FormButton label="I made a deposit" title="Float deposit" submitLabel="Send"
            fields={[{ name: 'currency', label: 'Currency', type: 'select', options: currencies, required: true, initial: currencies[0] || '' },
                { name: 'amount', label: 'Amount deposited', type: 'number', step: '0.01', required: true },
                { name: 'bankReference', label: 'Bank deposit reference', required: true }]}
            onSubmit={v => agentApi.notifyDeposit(Math.round(Number(v.amount) * 100), v.currency, v.bankReference.trim())}
            onDone={() => { me.reload(); deposits.reload(); }} />}>
            {(me.error || deposits.error) && <Notice kind="error">{me.error || deposits.error}</Notice>}
            <StatusNotice agent={a} />
            {a && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                {currencies.map(c => <Card key={c} label={`${c} e-float`} value={minor(a.float[c], c)} />)}
            </div>}
            <Section title="Deposits">
                <Table rows={deposits.value} empty="No deposits yet." columns={[
                    { key: 'created_at', label: 'Sent', render: r => show(r.created_at) }, { key: 'bank_reference', label: 'Bank reference' },
                    { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'note', label: 'Note' },
                ]} />
            </Section>
            {a && <Section title="Agent details"><KeyValues obj={{ 'Agent code': a.agent_code, Business: a.name, Contact: a.contact_person, Phone: a.phone, Email: a.email, Location: a.location }} /></Section>}
        </Page>
    );
}

export function AgentTransactions() {
    const txs = useLoad(() => agentApi.transactions());
    const [kind, setKind] = useState('');
    const rows = (txs.value || []).filter(r => !kind || r.kind === kind);
    return (
        <Page title="Transactions" actions={
            <select value={kind} onChange={e => setKind(e.target.value)}>
                <option value="">All</option><option value="CASH_IN">Cash in</option><option value="CASH_OUT">Cash out</option>
            </select>}>
            {txs.error && <Notice kind="error">{txs.error}</Notice>}
            <Section><Table rows={rows} empty="No transactions yet." columns={txColumns} /></Section>
        </Page>
    );
}

export function AgentCommissions() {
    const c = useLoad(() => agentApi.commissions());
    return (
        <Page title="Commissions">
            {c.error && <Notice kind="error">{c.error}</Notice>}
            <Section>
                <Table rows={c.value} empty="No commissions yet." columns={[
                    { key: 'month', label: 'Month' }, { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> }, { key: 'operations', label: 'Operations' },
                    { key: 'volume_minor', label: 'Volume', render: r => minor(r.volume_minor, r.currency) },
                    { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) },
                ]} />
            </Section>
        </Page>
    );
}
