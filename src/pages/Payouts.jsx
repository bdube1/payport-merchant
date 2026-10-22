import { balanceApi } from '../lib/api';
import { Page, Section, Table, Notice, useLoad, Badge, minor } from '../components/kit';

export default function Payouts() {
    const { value, error } = useLoad(() => balanceApi.payouts());
    return (
        <Page title="Payouts" subtitle="Settlements paid to your verified destinations. PAID shows the bank's reference; a RETURNED payout's funds become available again for the next settlement.">
            {error && <Notice kind="error">{error}</Notice>}
            <Section>
                <Table rows={value} empty="No payouts yet." columns={[
                    { key: 'payoutId', label: 'Payout' }, { key: 'currency', label: 'Currency' }, { key: 'amountMinor', label: 'Amount', render: r => minor(r.amountMinor, r.currency) },
                    { key: 'payments', label: 'Payments' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
                    { key: 'bankReference', label: 'Bank reference' }, { key: 'paidAt', label: 'Paid' }, { key: 'returnReason', label: 'Return reason' },
                ]} />
            </Section>
        </Page>
    );
}
