import { useState } from 'react';
import { apiKeysApi, platformApi, API_KEY_SCOPES } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { Page, Section, Table, Notice, useLoad, Badge, Act, FormModal } from '../components/kit';

function SecretOnce({ secret, onClose }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ padding: 24, maxWidth: 560, width: '100%' }}>
                <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Copy your secret key now</h2>
                <Notice kind="warn">{secret.warning || 'This secret is shown once. It cannot be retrieved again, only rotated.'}</Notice>
                {secret.publicKey && <p style={{ fontSize: 12.5 }}>Public key: <code>{secret.publicKey}</code></p>}
                <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={secret.secretKey || secret.secret || ''} style={{ flex: 1, fontFamily: 'monospace' }} onFocus={e => e.target.select()} />
                    <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(secret.secretKey || secret.secret || '')}>Copy</button>
                </div>
                {secret.oldKeyExpiresInHours !== undefined && <p style={{ fontSize: 12.5 }}>The previous key keeps working for {secret.oldKeyExpiresInHours} hours.</p>}
                <button className="btn btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={onClose}>I have saved it</button>
            </div>
        </div>
    );
}

export default function Developers() {
    const { user } = useAuth();
    const keys = useLoad(() => apiKeysApi.list());
    const ready = useLoad(() => platformApi.readiness());
    const [creating, setCreating] = useState(false);
    const [secret, setSecret] = useState(null);
    const liveReady = !!ready.value?.liveReady;
    const owner = user?.role === 'OWNER';
    return (
        <Page title="API keys" subtitle="Scoped, rotatable keys. Test keys move simulated money; live keys need your account to be live-ready, and only the owner can create them."
              actions={<button className="btn btn-primary" onClick={() => setCreating(true)}>Create key</button>}>
            {!liveReady && <Notice kind="warn">Live keys are not available yet: {(ready.value?.blockers || []).join('; ') || 'checking…'}. See Go-live.</Notice>}
            <Section title="Your keys">
                {keys.error && <Notice kind="error">{keys.error}</Notice>}
                <Table rows={keys.value} columns={[
                    { key: 'label', label: 'Label' }, { key: 'environment', label: 'Environment', render: r => <Badge value={r.environment} /> },
                    { key: 'publicKey', label: 'Public key', render: r => <code style={{ fontSize: 11.5 }}>{r.publicKey}</code> },
                    { key: 'scopes', label: 'Scopes', render: r => <span style={{ fontSize: 11.5 }}>{String(r.scopes || 'all')}</span> },
                    { key: 'expiresAt', label: 'Expires' }, { key: 'lastUsedAt', label: 'Last used' },
                    { key: 'revoked', label: 'State', render: r => <Badge value={r.revoked ? 'REVOKED' : 'ACTIVE'} /> },
                    { key: 'act', label: '', render: r => !r.revoked && <div style={{ display: 'flex', gap: 6 }}>
                        <Act label="Rotate" kind="ghost" run={() => apiKeysApi.rotate(r.id, 24)} done={(s) => { setSecret(s); keys.reload(); }}
                             confirm="Create a replacement key? The current one keeps working for 24 hours." />
                        <Act label="Revoke" kind="danger" run={() => apiKeysApi.revoke(r.id)} done={keys.reload} confirm="Revoke this key now? Requests using it will fail immediately." />
                    </div> },
                ]} />
            </Section>
            <Section title="Testing">
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>With a test key, wallet numbers ending in <code>0000001</code> or <code>0000002</code> are declined by the sandbox; any other number succeeds. Webhooks are signed (<code>Payport-Signature</code>): verify them with your endpoint's secret before trusting an event.</p>
            </Section>
            {creating && (
                <FormModal title="Create an API key" onClose={() => setCreating(false)}
                    intro={owner ? undefined : 'Only the account owner can create live keys.'}
                    fields={[
                        { name: 'environment', label: 'Environment', type: 'select', required: true, options: ['TEST', ...(liveReady && owner ? ['LIVE'] : [])], initial: 'TEST' },
                        { name: 'label', label: 'Label', type: 'text', required: true, help: 'Where it is used, e.g. "web shop server"' },
                        ...API_KEY_SCOPES.map(s => ({ name: 'scope:' + s, label: s, type: 'checkbox', initial: true })),
                        { name: 'expiresAt', label: 'Expires at (optional, YYYY-MM-DDTHH:MM)', type: 'text' },
                    ]}
                    onSubmit={v => apiKeysApi.create(v.environment, v.label, API_KEY_SCOPES.filter(s => v['scope:' + s]), v.expiresAt ? (v.expiresAt.length === 16 ? v.expiresAt + ':00' : v.expiresAt) : null)}
                    onDone={(s) => { setSecret(s); keys.reload(); }} />
            )}
            {secret && <SecretOnce secret={secret} onClose={() => setSecret(null)} />}
        </Page>
    );
}
