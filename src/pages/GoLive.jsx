import { platformApi } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, FormButton } from '../components/kit';

export default function GoLive() {
    const { user } = useAuth();
    const ready = useLoad(() => platformApi.readiness());
    const dests = useLoad(() => platformApi.destinations());
    const r = ready.value;
    const refresh = () => { ready.reload(); dests.reload(); };
    return (
        <Page title="Go-live" subtitle="What is needed before you can take live payments, and where your money is paid out.">
            {ready.error && <Notice kind="error">{ready.error}</Notice>}
            {r && (r.liveReady
                ? <Notice kind="ok">You are ready to take live payments. Create a live key under API keys.</Notice>
                : <Notice kind="warn">Not live yet. Still needed:<ul style={{ margin: '6px 0 0 18px' }}>{(r.blockers || []).map(b => <li key={b}>{b}</li>)}</ul></Notice>)}
            <Section title="Currencies enabled for live payments">
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 0 }}>PayPort enables currencies after review. Ask your account manager if one you need is missing.</p>
                <Table rows={r?.enablements} empty="None yet." columns={[{ key: 'country', label: 'Country' }, { key: 'currency', label: 'Currency' },
                    { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> }, { key: 'enabled_at', label: 'Since' }]} />
            </Section>
            <Section title="Settlement destinations" right={user?.role === 'OWNER' && (
                <FormButton label="Add destination" title="New settlement destination"
                    intro="PayPort verifies every destination (and every change) before paying anything to it. The account must be in your business's name."
                    fields={[{ name: 'currency', label: 'Currency', type: 'currency', required: true, initial: 'USD' },
                        { name: 'type', label: 'Type', type: 'select', options: ['BANK', 'MOBILE_WALLET'], required: true, initial: 'BANK' },
                        { name: 'accountName', label: 'Account name', type: 'text', required: true }, { name: 'accountNumber', label: 'Account / wallet number', type: 'text', required: true },
                        { name: 'institution', label: 'Bank / wallet provider', type: 'text', required: true }, { name: 'branch', label: 'Branch', type: 'text' }]}
                    onSubmit={v => platformApi.addDestination({ ...v, currency: v.currency.toUpperCase() })} onDone={refresh} />)}>
                {dests.error && <Notice kind="error">{dests.error}</Notice>}
                <Table rows={dests.value} empty="No destination yet." columns={[
                    { key: 'currency', label: 'Currency' }, { key: 'type', label: 'Type' }, { key: 'institution', label: 'Institution' },
                    { key: 'account_name', label: 'Account name' }, { key: 'account_number', label: 'Account' },
                    { key: 'status', label: 'Status', render: x => <Badge value={x.status} /> }, { key: 'review_note', label: 'Note' },
                ]} />
            </Section>
        </Page>
    );
}
