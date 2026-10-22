import { useState } from 'react';
import { posApi } from '../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, minor, FormButton, Act, data } from '../components/kit';

/**
 * POS terminals: register a till (its secret is shown once), disable or re-enable it, and see its
 * sales. Terminals sign every request (HMAC with a nonce); the integration guide is in the API docs.
 */
export default function Pos() {
    const terminals = useLoad(() => posApi.terminals());
    const sales = useLoad(() => posApi.sales());
    const [secret, setSecret] = useState(null);
    const reload = () => { terminals.reload(); sales.reload(); };
    return (
        <Page title="POS terminals" subtitle="Each sale on a terminal becomes a checkout the customer pays by QR, PayPort wallet or mobile money. Card acceptance at terminals is switched on separately by PayPort.">
            {terminals.error && <Notice kind={terminals.error.includes('not available') ? 'warn' : 'error'}>{terminals.error}</Notice>}
            {secret && <Notice kind="ok">
                <b>Terminal {secret.terminalId}</b> registered. Its secret is <code style={{ userSelect: 'all' }}>{secret.secret}</code>.
                Enter it in the terminal now: PayPort will not show it again.
                <button className="btn btn-ghost" style={{ marginLeft: 10, padding: '2px 10px' }} onClick={() => setSecret(null)}>Done</button>
            </Notice>}
            <Section title="Terminals" right={<FormButton label="Register terminal" title="Register a POS terminal" submitLabel="Register"
                fields={[{ name: 'label', label: 'Label (e.g. Till 1, Front desk)', required: true }]}
                onSubmit={async v => { const r = await posApi.register(v.label); setSecret(data(r)); return r; }} onDone={reload} />}>
                <Table rows={terminals.value} empty="No terminals yet." columns={[
                    { key: 'terminal_id', label: 'Terminal' }, { key: 'label', label: 'Label' },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'status_reason', label: 'Reason' },
                    { key: 'last_seen_at', label: 'Last seen' },
                    { key: 'actions', label: '', render: r => r.status === 'ACTIVE'
                        ? <FormButton label="Disable" kind="ghost" title={`Disable ${r.terminal_id}`} submitLabel="Disable"
                            fields={[{ name: 'reason', label: 'Reason', required: true }]} onSubmit={v => posApi.setStatus(r.terminal_id, false, v.reason)} onDone={reload} />
                        : <Act label="Enable" run={() => posApi.setStatus(r.terminal_id, true, 'Re-enabled by merchant')} done={reload} /> },
                ]} />
            </Section>
            <Section title="Sales">
                <Table rows={sales.value} empty="No sales yet." columns={[
                    { key: 'created_at', label: 'When' }, { key: 'terminal_id', label: 'Terminal' }, { key: 'sale_ref', label: 'Sale' },
                    { key: 'amount_minor', label: 'Amount', render: r => minor(r.amount_minor, r.currency) },
                    { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> }, { key: 'checkout_session_id', label: 'Checkout' },
                ]} />
            </Section>
        </Page>
    );
}
