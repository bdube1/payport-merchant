import { useState } from 'react';
import { agentApi } from '../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, minor, FormButton, KeyValues, data } from '../components/kit';
import toast from 'react-hot-toast';

/**
 * Agent screens: apply, float (bank deposits approved by PayPort finance), cash-in to a customer's
 * wallet, cash-out against the customer's one-time code, transactions and commissions. Every rule
 * (float can't go negative, codes are single-use, four-eyes on float) is enforced by the backend.
 */
export default function Agent() {
    const me = useLoad(() => agentApi.me());
    const agent = me.value?.agent;
    const deposits = useLoad(() => (agent ? agentApi.deposits() : Promise.resolve({ data: { data: [] } })), [agent?.id]);
    const txs = useLoad(() => (agent ? agentApi.transactions() : Promise.resolve({ data: { data: [] } })), [agent?.id]);
    const commissions = useLoad(() => (agent ? agentApi.commissions() : Promise.resolve({ data: { data: [] } })), [agent?.id]);
    const reloadAll = () => { me.reload(); deposits.reload(); txs.reload(); commissions.reload(); };
    const currencies = Object.keys(agent?.float || {});
    const [last, setLast] = useState(null);

    if (me.loading && !me.value) return <Page title="Agent"><p>Loading…</p></Page>;
    if (me.error) return <Page title="Agent"><Notice kind="error">{me.error}</Notice></Page>;

    if (!agent) {
        return (
            <Page title="Become a PayPort agent" subtitle="Agents give customers cash-in (cash to wallet) and cash-out (wallet to cash) and earn a commission on each.">
                <Section>
                    <FormButton label="Apply to be an agent" title="Agent application" submitLabel="Apply"
                        fields={[{ name: 'name', label: 'Agent name (as customers see it)', required: true },
                            { name: 'phone', label: 'Agent phone (international format)', required: true, help: 'e.g. +263772100100' },
                            { name: 'location', label: 'Location (street, suburb, town)', required: true }]}
                        onSubmit={v => agentApi.apply(v.name, v.phone, v.location)} onDone={reloadAll} />
                </Section>
            </Page>
        );
    }

    const active = agent.status === 'ACTIVE';
    const today = new Date().toISOString().slice(0, 10), month = today.slice(0, 7);
    const sumBy = (rows, test, field) => (rows || []).filter(test).reduce((acc, r) => ({ ...acc, [r.currency]: (acc[r.currency] || 0) + Number(r[field] || 0) }), {});
    const fmtSum = (m) => Object.keys(m).length ? Object.entries(m).map(([c, v]) => minor(v, c)).join(' · ') : '—';
    const isToday = r => String(r.created_at || '').slice(0, 10) === today;
    const cashInToday = (txs.value || []).filter(r => isToday(r) && r.kind === 'CASH_IN');
    const cashOutToday = (txs.value || []).filter(r => isToday(r) && r.kind === 'CASH_OUT');
    const Card = ({ label, value, sub }) => (
        <div className="card" style={{ padding: 16, minWidth: 180, flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
    return (
        <Page title={`${agent.name}`} actions={<Badge value={agent.status} />}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <Card label="Agent code" value={<span style={{ fontFamily: 'monospace' }}>{agent.agent_code}</span>} sub={agent.location} />
                <Card label="Float" value={fmtSum(agent.float || {})} />
                <Card label="Cash-in today" value={fmtSum(sumBy(cashInToday, () => true, 'amount_minor'))} sub={`${cashInToday.length} customers`} />
                <Card label="Cash-out today" value={fmtSum(sumBy(cashOutToday, () => true, 'amount_minor'))} sub={`${cashOutToday.length} customers`} />
                <Card label="Commission today" value={fmtSum(sumBy(txs.value, isToday, 'commission_minor'))}
                    sub={`This month: ${fmtSum(sumBy(txs.value, r => String(r.created_at || '').slice(0, 7) === month, 'commission_minor'))}`} />
            </div>
            {agent.status === 'PENDING' && <Notice kind="warn">Your application is being reviewed.</Notice>}
            {agent.status === 'SUSPENDED' && <Notice kind="error">Your agent account is suspended{agent.status_reason ? `: ${agent.status_reason}` : ''}. Contact PayPort.</Notice>}
            {last && <Notice kind="ok">{last}</Notice>}

            <Section title="Float" right={active && <FormButton label="I made a float deposit" title="Float deposit"
                intro="Deposit cash into PayPort's bank account, then tell us the bank reference. PayPort finance confirms it against the bank statement and your float goes up."
                fields={[{ name: 'currency', label: 'Currency', type: 'select', options: currencies, required: true },
                    { name: 'amount', label: 'Amount deposited', type: 'number', step: '0.01', required: true },
                    { name: 'bankReference', label: 'Bank deposit reference', required: true }]}
                onSubmit={v => agentApi.notifyDeposit(Math.round(Number(v.amount) * 100), v.currency, v.bankReference)} onDone={reloadAll} />}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {currencies.map(c => (
                        <div key={c} className="card" style={{ padding: 16, minWidth: 180 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{c} float</div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{minor(agent.float[c], c)}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {active && <Section title="Serve a customer">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <FormButton label="Cash in" title="Cash in (customer gives you cash)" submitLabel="Send to wallet"
                        intro="The amount moves from your float to the customer's PayPort wallet. Take the cash first."
                        fields={[{ name: 'customer', label: 'Customer phone or wallet number', required: true },
                            { name: 'currency', label: 'Currency', type: 'select', options: currencies, required: true },
                            { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true }]}
                        onSubmit={async v => {
                            const r = await agentApi.cashIn(v.customer.trim(), v.currency, Math.round(Number(v.amount) * 100), `web-${Date.now()}`);
                            const d = data(r);
                            setLast(`Cash-in done: ${minor(d.amountMinor, d.currency)} to ${d.wallet}. Commission ${minor(d.commissionMinor, d.currency)}. Float now ${minor(d.floatMinor, d.currency)}.`);
                            return r;
                        }} onDone={reloadAll} />
                    <FormButton label="Cash out" kind="ghost" title="Cash out (customer receives cash)" submitLabel="Redeem code"
                        intro="The customer shows their one-time cash-out code. Pay out the cash only after this succeeds."
                        fields={[{ name: 'customerPhone', label: 'Customer phone', required: true, help: 'International format, e.g. +263771234567' },
                            { name: 'code', label: 'Cash-out code', required: true }]}
                        onSubmit={async v => {
                            const r = await agentApi.cashOut(v.customerPhone.trim(), v.code.trim());
                            const d = data(r);
                            setLast(`Pay out ${minor(d.amountMinor, d.currency)} in cash now. Commission ${minor(d.commissionMinor, d.currency)}. Float now ${minor(d.floatMinor, d.currency)}.`);
                            toast.success('Code redeemed: pay out the cash');
                            return r;
                        }} onDone={reloadAll} />
                </div>
            </Section>}

            <Section title="Float deposits">
                {deposits.error && <Notice kind="error">{deposits.error}</Notice>}
                <Table rows={deposits.value} empty="No deposits yet." columns={[
                    { key: 'created_at', label: 'Notified' }, { key: 'bank_reference', label: 'Bank reference' },
                    { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'note', label: 'Note' },
                ]} />
            </Section>

            <Section title="Transactions">
                <Table rows={txs.value} empty="No transactions yet." columns={[
                    { key: 'created_at', label: 'When' }, { key: 'kind', label: 'Type', render: r => <Badge value={r.kind} /> },
                    { key: 'wallet_ref', label: 'Wallet' }, { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) }, { key: 'op_ref', label: 'Reference' },
                ]} />
            </Section>

            <Section title="Commissions by month">
                <Table rows={commissions.value} empty="No commissions yet." columns={[
                    { key: 'month', label: 'Month' }, { key: 'kind', label: 'Type' }, { key: 'operations', label: 'Operations' },
                    { key: 'volume_minor', label: 'Volume', render: r => minor(r.volume_minor, r.currency) },
                    { key: 'commission_minor', label: 'Commission', render: r => minor(r.commission_minor, r.currency) },
                ]} />
            </Section>

            <Section title="Agent details"><KeyValues obj={{ code: agent.agent_code, phone: agent.phone, country: agent.country, applied: agent.applied_at, decided: agent.decided_at }} /></Section>
        </Page>
    );
}
