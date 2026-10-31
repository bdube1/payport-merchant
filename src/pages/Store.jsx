import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Page, Section, Table, Notice, Badge, minor, show } from '../components/kit';
import { storeApi, imageUrl, storeSession } from '../lib/commerce';
import { errorMessage } from '../lib/api';
import Share from './store/Share.jsx';

const TABS = ['Overview', 'Products', 'Links', 'Orders', 'Customers', 'Settings'];
const DELIVERY_LABEL = { PREPARING: 'Preparing', READY: 'Ready to collect', OUT: 'Out for delivery', DELIVERED: 'Delivered', COLLECTED: 'Collected', NOT_NEEDED: '—' };
const NEXT_STEP = { DELIVERY: { PREPARING: ['OUT', 'Out for delivery'], OUT: ['DELIVERED', 'Delivered'] }, PICKUP: { PREPARING: ['READY', 'Ready to collect'], READY: ['COLLECTED', 'Collected'] } };
const PAYMENT_LABEL = { NOT_STARTED: 'Not paid', AWAITING_PAYMENT: 'Not paid', PENDING: 'Being confirmed', CONFIRMING: 'Being confirmed', PAID: 'Paid', FAILED: 'Failed', EXPIRED: 'Not paid' };
const REFUND_LABEL = { REQUESTED: 'Refund requested', PARTIAL: 'Part refunded', REFUNDED: 'Refunded' };

const data = (r) => r?.data?.data;
const toMinor = (v) => (v === '' || v === null || v === undefined ? null : Math.round(parseFloat(v) * 100));
const field = { width: '100%', padding: 9, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
const label = { fontSize: 12.5, fontWeight: 700, display: 'block', margin: '0 0 5px' };

function PaymentBadge({ status }) {
    const cls = { PAID: 'badge-green', PENDING: 'badge-amber', CONFIRMING: 'badge-amber', FAILED: 'badge-red' }[status] || 'badge-gray';
    return <span className={`badge ${cls}`}>{PAYMENT_LABEL[status] || status}</span>;
}

function Modal({ title, onClose, onSubmit, busy, error, submitLabel = 'Save', children }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <form onSubmit={onSubmit} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>{title}</h2>
                {error && <Notice kind="error">{error}</Notice>}
                <div style={{ display: 'grid', gap: 12 }}>{children}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>{busy ? 'Working…' : submitLabel}</button>
                </div>
            </form>
        </div>
    );
}

function useForm(initial, save, onDone) {
    const [v, setV] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k) => (e) => setV(s => ({ ...s, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { const r = await save(v); toast.success('Saved'); onDone(data(r)); }
        catch (err) { if (err?.message !== 'Cancelled') setError(errorMessage(err, 'Could not save')); }
        finally { setBusy(false); }
    };
    return { v, set, setV, busy, error, submit };
}

function PictureField({ value, onChange }) {
    const [busy, setBusy] = useState(false);
    const pick = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        try { onChange(data(await storeApi.upload(f)).imageId); }
        catch (err) { toast.error(errorMessage(err, 'Upload failed')); }
        finally { setBusy(false); e.target.value = ''; }
    };
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {value ? <img src={imageUrl(value)} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />
                : <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg-2)', display: 'grid', placeItems: 'center' }}><ImageIcon size={20} /></div>}
            <label className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>
                {busy ? 'Uploading…' : value ? 'Change' : 'Add picture'}
                <input type="file" accept="image/jpeg,image/png" onChange={pick} style={{ display: 'none' }} />
            </label>
            {value && <button type="button" className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => onChange(null)}>Remove</button>}
        </div>
    );
}

// ─── overview ────────────────────────────────────────────────────────────────

function Stat({ title, value, sub }) {
    return (
        <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

function Overview({ ov, go }) {
    if (!ov) return null;
    const store = ov.store || {};
    return (
        <>
            {!ov.paymentsOnline && <Notice kind="warn">Payments are reconnecting. Your store stays open; payments made meanwhile appear when it is back.</Notice>}
            <Section title={store.name} right={<a className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} href={store.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open store</a>}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, wordBreak: 'break-all' }}>{store.url}</div>
                <Share url={store.url} text={store.name} />
            </Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                {(ov.sales?.length ? ov.sales : [{ currency: ov.currencies?.[0] || 'USD', todayMinor: 0, weekMinor: 0, monthMinor: 0, ordersMonth: 0 }]).map(s => (
                    <Stat key={s.currency} title={`Sales today (${s.currency})`} value={minor(s.todayMinor)} sub={`7 days ${minor(s.weekMinor)} · 30 days ${minor(s.monthMinor)}`} />
                ))}
                <Stat title="To fulfil" value={ov.toFulfil} />
                <Stat title="Being confirmed" value={ov.beingConfirmed} />
                <Stat title="Active links" value={ov.activeLinks} />
                <Stat title="Products on sale" value={ov.activeProducts} />
                <Stat title="Paid / started (30 days)" value={`${ov.checkoutsPaid30d} / ${ov.checkoutsStarted30d}`} sub={ov.conversion30d == null ? null : `${Math.round(ov.conversion30d * 100)}%`} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => go('Links', true)}><Plus size={15} /> Payment link</button>
                <button className="btn btn-ghost" onClick={() => go('Products', true)}><Plus size={15} /> Product</button>
            </div>
        </>
    );
}

// ─── products ────────────────────────────────────────────────────────────────

function ProductForm({ product, currencies, onClose, onDone }) {
    const f = useForm({
        name: product?.name || '', description: product?.description || '', price: product ? (product.priceMinor / 100).toFixed(2) : '',
        currency: product?.currency || currencies[0] || 'USD', imageId: product?.imageId || null, visible: product ? product.status === 'ACTIVE' : true,
        stock: product?.stock ?? '',
    }, (v) => {
        const b = { name: v.name, description: v.description, priceMinor: toMinor(v.price), currency: v.currency, imageId: v.imageId, status: v.visible ? 'ACTIVE' : 'HIDDEN', stock: v.stock === '' ? null : Number(v.stock) };
        return product ? storeApi.saveProduct(product.id, b) : storeApi.createProduct(b);
    }, (d) => { onDone(d); onClose(); });
    return (
        <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose} onSubmit={f.submit} busy={f.busy} error={f.error}>
            <PictureField value={f.v.imageId} onChange={f.set('imageId')} />
            <div><label style={label}>Name</label><input style={field} value={f.v.name} onChange={f.set('name')} required maxLength={120} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', gap: 10 }}>
                <div><label style={label}>Price</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.price} onChange={f.set('price')} required /></div>
                <div><label style={label}>Currency</label><select style={field} value={f.v.currency} onChange={f.set('currency')}>{currencies.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={label}>In stock</label><input style={field} type="number" min="0" step="1" value={f.v.stock} onChange={f.set('stock')} placeholder="Not counted" /></div>
            </div>
            <div><label style={label}>Description</label><textarea style={{ ...field, minHeight: 90 }} value={f.v.description} onChange={f.set('description')} maxLength={2000} /></div>
            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.v.visible} onChange={f.set('visible')} /> On sale</label>
        </Modal>
    );
}

function Products({ canManage, currencies, startNew, onLink }) {
    const [rows, setRows] = useState(null);
    const [edit, setEdit] = useState(startNew ? 'new' : null);
    const load = () => storeApi.products().then(r => setRows(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    return (
        <Section title="Products" right={canManage && <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setEdit('new')}><Plus size={14} /> New product</button>}>
            <Table rows={rows || []} noExport empty={rows ? 'No products yet.' : 'Loading…'} onRow={canManage ? (p) => setEdit(p) : undefined} columns={[
                { key: 'pic', label: '', render: p => p.imageId ? <img src={imageUrl(p.imageId)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} /> : null },
                { key: 'name', label: 'Product' },
                { key: 'price', label: 'Price', render: p => `${p.currency} ${p.price}` },
                { key: 'stock', label: 'In stock', render: p => p.stock == null ? '—' : p.stock === 0 ? <Badge value="SOLD_OUT" /> : p.stock },
                { key: 'status', label: 'Status', render: p => <Badge value={p.status === 'ACTIVE' ? 'ON_SALE' : 'HIDDEN'} /> },
                { key: 'share', label: '', render: p => (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <Share url={p.url} text={`${p.name} - ${p.currency} ${p.price}`} compact />
                        {canManage && <button className="btn btn-ghost" style={{ padding: '5px 9px', fontSize: 12.5 }} onClick={() => onLink(p)}>Payment link</button>}
                    </div>
                ) },
            ]} />
            {edit && <ProductForm product={edit === 'new' ? null : edit} currencies={currencies} onClose={() => setEdit(null)} onDone={load} />}
        </Section>
    );
}

// ─── links ───────────────────────────────────────────────────────────────────

function LinkForm({ currencies, product, onClose, onDone }) {
    const f = useForm({
        kind: product ? 'product' : 'fixed', title: product?.name || '', description: '', amount: '', min: '', max: '',
        currency: currencies[0] || 'USD', reference: '', expires: '', singleUse: false, productId: product?.id || '',
    }, (v) => storeApi.createLink({
        title: v.title, description: v.description || null, currency: v.currency, reference: v.reference || null,
        amountMinor: v.kind === 'fixed' ? toMinor(v.amount) : null,
        minMinor: v.kind === 'open' ? toMinor(v.min) : null, maxMinor: v.kind === 'open' ? toMinor(v.max) : null,
        productId: v.kind === 'product' ? v.productId : null, expiresAt: v.expires || null, reusable: !v.singleUse,
    }), (d) => { onDone(d); onClose(); });
    const kinds = [['fixed', 'Fixed amount'], ['open', 'Customer enters amount']];
    return (
        <Modal title={product ? `Payment link for ${product.name}` : 'New payment link'} submitLabel="Create link" onClose={onClose} onSubmit={f.submit} busy={f.busy} error={f.error}>
            {!product && (
                <div style={{ display: 'flex', gap: 6 }}>
                    {kinds.map(([k, l]) => (
                        <button key={k} type="button" className={`btn ${f.v.kind === k ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, padding: '7px 10px', fontSize: 12.5 }} onClick={() => f.set('kind')(k)}>{l}</button>
                    ))}
                </div>
            )}
            <div><label style={label}>Title</label><input style={field} value={f.v.title} onChange={f.set('title')} required maxLength={120} /></div>
            {f.v.kind !== 'product' && (
                <div style={{ display: 'grid', gridTemplateColumns: f.v.kind === 'fixed' ? '1fr 110px' : '1fr 1fr 110px', gap: 10 }}>
                    {f.v.kind === 'fixed'
                        ? <div><label style={label}>Amount</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.amount} onChange={f.set('amount')} required /></div>
                        : <>
                            <div><label style={label}>From</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.min} onChange={f.set('min')} /></div>
                            <div><label style={label}>Up to</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.max} onChange={f.set('max')} /></div>
                        </>}
                    <div><label style={label}>Currency</label><select style={field} value={f.v.currency} onChange={f.set('currency')}>{currencies.map(c => <option key={c}>{c}</option>)}</select></div>
                </div>
            )}
            <div><label style={label}>Description</label><input style={field} value={f.v.description} onChange={f.set('description')} maxLength={600} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={label}>Your reference</label><input style={field} value={f.v.reference} onChange={f.set('reference')} maxLength={60} /></div>
                <div><label style={label}>Expires</label><input style={field} type="date" value={f.v.expires} onChange={f.set('expires')} min={new Date().toISOString().slice(0, 10)} /></div>
            </div>
            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.v.singleUse} onChange={f.set('singleUse')} /> One payment only</label>
        </Modal>
    );
}

function Links({ canManage, currencies, startNew, forProduct, clearProduct }) {
    const [rows, setRows] = useState(null);
    const [creating, setCreating] = useState(!!startNew || !!forProduct);
    const [made, setMade] = useState(null);
    const load = () => storeApi.links().then(r => setRows(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    const toggle = async (l) => {
        const on = l.status !== 'ACTIVE';
        if (!window.confirm('Are you sure?')) return;
        try { await storeApi.setLink(l.id, on); toast.success(on ? 'Switched on' : 'Switched off'); load(); }
        catch (e) { toast.error(errorMessage(e, 'Could not change')); }
    };
    const amount = (l) => l.amountMinor != null ? minor(l.amountMinor, l.currency)
        : l.minMinor != null || l.maxMinor != null ? `${l.currency} ${l.minMinor != null ? (l.minMinor / 100).toFixed(2) : '…'} – ${l.maxMinor != null ? (l.maxMinor / 100).toFixed(2) : '…'}` : `${l.currency} any`;
    return (
        <Section title="Payment links" right={canManage && <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setCreating(true)}><Plus size={14} /> New link</button>}>
            {made && (
                <Notice kind="ok">
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{made.title}</div>
                    <div style={{ wordBreak: 'break-all', marginBottom: 8 }}>{made.url}</div>
                    <Share url={made.url} text={made.title} />
                </Notice>
            )}
            <Table rows={rows || []} noExport empty={rows ? 'No payment links yet.' : 'Loading…'} columns={[
                { key: 'title', label: 'Link' },
                { key: 'amount', label: 'Amount', render: amount },
                { key: 'reference', label: 'Reference' },
                { key: 'expiresAt', label: 'Expires', render: l => l.expiresAt ? show(l.expiresAt).slice(0, 10) : '—' },
                { key: 'paid', label: 'Paid', render: l => `${l.paidOrders} · ${minor(l.paidMinor, l.currency)}` },
                { key: 'status', label: 'Status', render: l => <Badge value={l.status} /> },
                { key: 'actions', label: '', render: l => (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {l.status === 'ACTIVE' && <Share url={l.url} text={l.title} compact />}
                        {canManage && (l.status === 'ACTIVE' || l.status === 'DISABLED') && (
                            <button className="btn btn-ghost" style={{ padding: '5px 9px', fontSize: 12.5 }} onClick={() => toggle(l)}>{l.status === 'ACTIVE' ? 'Switch off' : 'Switch on'}</button>
                        )}
                    </div>
                ) },
            ]} />
            {creating && <LinkForm currencies={currencies} product={forProduct} onClose={() => { setCreating(false); clearProduct(); }} onDone={(d) => { setMade(d); load(); }} />}
        </Section>
    );
}

// ─── orders ──────────────────────────────────────────────────────────────────

function OrderPanel({ orderRef, canManage, onClose, onChanged }) {
    const [o, setO] = useState(null);
    const [refund, setRefund] = useState(false);
    const load = () => storeApi.order(orderRef).then(r => setO(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, [orderRef]);
    const status = async (s) => {
        if (!window.confirm('Are you sure?')) return;
        try { await storeApi.orderStatus(orderRef, s); toast.success('Saved'); load(); onChanged(); }
        catch (e) { toast.error(errorMessage(e, 'Could not change')); }
    };
    const step = async (s) => {
        if (!window.confirm('Are you sure?')) return;
        try { await storeApi.delivery(orderRef, s); toast.success('Saved'); load(); onChanged(); }
        catch (e) { toast.error(errorMessage(e, 'Could not change')); }
    };
    const left = o ? o.amountMinor - (o.refunds || []).filter(r => r.status !== 'FAILED').reduce((a, r) => a + r.amountMinor, 0) : 0;
    const f = useForm({ amount: '', reason: '' }, (v) => {
        if (!window.confirm('Are you sure?')) return Promise.reject(new Error('Cancelled'));
        return storeApi.refund(orderRef, toMinor(v.amount), v.reason);
    }, () => { setRefund(false); load(); onChanged(); });
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, height: '100%', overflow: 'auto', background: 'var(--bg-card)', padding: 24, borderLeft: '1px solid var(--border)' }}>
                {!o ? 'Loading…' : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{o.orderRef}</h2>
                            <PaymentBadge status={o.paymentStatus} />
                        </div>
                        {o.stockShort && <Notice kind="warn">Sold out while this order was being paid</Notice>}
                        {REFUND_LABEL[o.refundStatus] && <Notice kind={o.refundStatus === 'REQUESTED' ? 'warn' : 'info'}>{REFUND_LABEL[o.refundStatus]}</Notice>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', fontSize: 13.5, marginBottom: 18 }}>
                            {(o.items || []).length > 0
                                ? <><div style={{ color: 'var(--text-2)' }}>Items</div><div>{o.items.map((i, n) => <div key={n}>{i.quantity} x {i.name} <span style={{ color: 'var(--text-2)' }}>{minor(i.unitMinor * i.quantity, o.currency)}</span></div>)}</div></>
                                : <><div style={{ color: 'var(--text-2)' }}>Item</div><div>{o.itemName}{o.quantity > 1 ? ` x${o.quantity}` : ''}</div></>}
                            {o.deliveryMethod !== 'NONE' && <><div style={{ color: 'var(--text-2)' }}>{o.deliveryMethod === 'DELIVERY' ? 'Delivery' : 'Pickup'}</div>
                                <div>{DELIVERY_LABEL[o.deliveryStatus] || o.deliveryStatus}{o.deliveryFeeMinor > 0 ? ` · fee ${minor(o.deliveryFeeMinor, o.currency)}` : ''}</div></>}
                            {o.deliveryAddress && <><div style={{ color: 'var(--text-2)' }}>Deliver to</div><div>{o.deliveryAddress}</div></>}
                            <div style={{ color: 'var(--text-2)' }}>Total</div><div style={{ fontWeight: 800 }}>{minor(o.amountMinor, o.currency)}</div>
                            <div style={{ color: 'var(--text-2)' }}>Customer</div><div>{[o.customerName, o.customerPhone].filter(Boolean).join(' · ') || '—'}</div>
                            {o.note && <><div style={{ color: 'var(--text-2)' }}>Note</div><div>{o.note}</div></>}
                            <div style={{ color: 'var(--text-2)' }}>From</div><div>{o.source === 'LINK' ? 'Payment link' : 'Store'}</div>
                            <div style={{ color: 'var(--text-2)' }}>Order</div><div><Badge value={o.orderStatus} /></div>
                            <div style={{ color: 'var(--text-2)' }}>Placed</div><div>{show(o.createdAt)}</div>
                            {o.paidAt && <><div style={{ color: 'var(--text-2)' }}>Paid</div><div>{show(o.paidAt)}</div></>}
                        </div>
                        {(o.refunds || []).length > 0 && (
                            <Section title="Refunds">
                                <Table rows={o.refunds} noExport columns={[
                                    { key: 'amountMinor', label: 'Amount', render: r => minor(r.amountMinor, o.currency) },
                                    { key: 'reason', label: 'Reason' },
                                    { key: 'status', label: 'Status', render: r => <Badge value={r.status === 'COMPLETED' ? 'PAID' : r.status === 'REQUESTED' ? 'PENDING' : r.status} /> },
                                ]} />
                            </Section>
                        )}
                        {canManage && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {o.paymentStatus === 'PAID' && NEXT_STEP[o.deliveryMethod]?.[o.deliveryStatus] && (
                                    <button className="btn btn-primary" onClick={() => step(NEXT_STEP[o.deliveryMethod][o.deliveryStatus][0])}>{NEXT_STEP[o.deliveryMethod][o.deliveryStatus][1]}</button>)}
                                {o.paymentStatus === 'PAID' && o.orderStatus === 'OPEN' && o.deliveryMethod === 'NONE' && <button className="btn btn-primary" onClick={() => status('FULFILLED')}>Mark fulfilled</button>}
                                {o.paymentStatus === 'PAID' && left > 0 && <button className="btn btn-ghost" onClick={() => setRefund(true)}>Refund</button>}
                                {o.orderStatus !== 'CANCELLED' && (o.paymentStatus !== 'PAID' || o.refundStatus === 'REFUNDED') && <button className="btn btn-ghost" onClick={() => status('CANCELLED')}>Cancel order</button>}
                            </div>
                        )}
                        {refund && (
                            <Modal title="Refund" submitLabel="Refund" onClose={() => setRefund(false)} onSubmit={f.submit} busy={f.busy} error={f.error}>
                                <div><label style={label}>Amount ({o.currency}), up to {(left / 100).toFixed(2)}</label>
                                    <input style={field} type="number" min="0.01" step="0.01" max={(left / 100).toFixed(2)} value={f.v.amount} onChange={f.set('amount')} required /></div>
                                <div><label style={label}>Reason</label><input style={field} value={f.v.reason} onChange={f.set('reason')} required maxLength={300} /></div>
                            </Modal>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Orders({ canManage }) {
    const [rows, setRows] = useState(null);
    const [filter, setFilter] = useState('');
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);
    const load = () => storeApi.orders(filter, q).then(r => setRows(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, [filter]);
    return (
        <Section title="Orders" right={
            <>
                <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} style={{ ...field, width: 180 }} />
                <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...field, width: 170 }}>
                    <option value="">All</option>
                    <option value="PAID">Paid</option>
                    <option value="CONFIRMING">Being confirmed</option>
                    <option value="AWAITING_PAYMENT">Not paid</option>
                    <option value="FAILED">Failed</option>
                </select>
            </>
        }>
            <Table rows={rows || []} exportName="Store orders" empty={rows ? 'No orders yet.' : 'Loading…'} onRow={(o) => setOpen(o.orderRef)} columns={[
                { key: 'orderRef', label: 'Order' },
                { key: 'createdAt', label: 'Placed', render: o => show(o.createdAt).slice(0, 16) },
                { key: 'itemName', label: 'Item', render: o => `${o.itemName}${o.quantity > 1 ? ` x${o.quantity}` : ''}` },
                { key: 'customer', label: 'Customer', render: o => [o.customerName, o.customerPhone].filter(Boolean).join(' · ') || '—' },
                { key: 'amountMinor', label: 'Total', render: o => minor(o.amountMinor, o.currency) },
                { key: 'paymentStatus', label: 'Payment', render: o => <PaymentBadge status={o.paymentStatus} /> },
                { key: 'deliveryStatus', label: 'Delivery', render: o => o.deliveryMethod === 'NONE' ? '—' : `${o.deliveryMethod === 'DELIVERY' ? 'Delivery' : 'Pickup'} · ${DELIVERY_LABEL[o.deliveryStatus] || o.deliveryStatus}` },
                { key: 'refundStatus', label: 'Refund', render: o => REFUND_LABEL[o.refundStatus] || '—' },
                { key: 'orderStatus', label: 'Order', render: o => <Badge value={o.orderStatus} /> },
            ]} />
            {open && <OrderPanel orderRef={open} canManage={canManage} onClose={() => setOpen(null)} onChanged={load} />}
        </Section>
    );
}

// ─── customers ───────────────────────────────────────────────────────────────

function Customers() {
    const [rows, setRows] = useState(null);
    const [q, setQ] = useState('');
    const load = () => storeApi.customers(q).then(r => setRows(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    return (
        <Section title="Customers" right={<input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} style={{ ...field, width: 200 }} />}>
            <Table rows={rows || []} exportName="Store customers" empty={rows ? 'No customers yet.' : 'Loading…'} columns={[
                { key: 'name', label: 'Name' },
                { key: 'phone', label: 'Phone' },
                { key: 'orders', label: 'Paid orders' },
                { key: 'spent', label: 'Spent' },
                { key: 'lastOrderAt', label: 'Last order', render: c => show(c.lastOrderAt).slice(0, 16) },
            ]} />
        </Section>
    );
}

// ─── settings ────────────────────────────────────────────────────────────────

function Settings({ store, canManage, onSaved }) {
    const f = useForm({ ...store, open: store.status !== 'CLOSED', deliveryFee: ((store.deliveryFeeMinor || 0) / 100).toFixed(2),
        freeFrom: store.freeDeliveryFromMinor != null ? (store.freeDeliveryFromMinor / 100).toFixed(2) : '' }, (v) => {
        if (store.status !== 'CLOSED' && !v.open && !window.confirm('Are you sure?')) return Promise.reject(new Error('Cancelled'));
        return storeApi.saveStore({ name: v.name, slug: v.slug, about: v.about, whatsapp: v.whatsapp, themeColor: v.themeColor, logoImage: v.logoImage, status: v.open ? 'OPEN' : 'CLOSED',
            pickupEnabled: !!v.pickupEnabled, pickupNote: v.pickupNote, deliveryEnabled: !!v.deliveryEnabled, deliveryNote: v.deliveryNote,
            deliveryFeeMinor: toMinor(v.deliveryFee) || 0, freeDeliveryFromMinor: toMinor(v.freeFrom) });
    }, onSaved);
    const base = useMemo(() => (store.url || '').replace(/[^/]*$/, ''), [store.url]);
    return (
        <Section title="Store">
            {f.error && <Notice kind="error">{f.error}</Notice>}
            <form onSubmit={f.submit} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
                <PictureField value={f.v.logoImage} onChange={f.set('logoImage')} />
                <div><label style={label}>Store name</label><input style={field} value={f.v.name || ''} onChange={f.set('name')} required maxLength={120} disabled={!canManage} /></div>
                <div><label style={label}>Store address</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{base}</span>
                        <input style={field} value={f.v.slug || ''} onChange={f.set('slug')} required maxLength={60} disabled={!canManage} /></div></div>
                <div><label style={label}>About</label><textarea style={{ ...field, minHeight: 80 }} value={f.v.about || ''} onChange={f.set('about')} maxLength={600} disabled={!canManage} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                    <div><label style={label}>WhatsApp number</label><input style={field} value={f.v.whatsapp || ''} onChange={f.set('whatsapp')} placeholder="+263…" maxLength={20} disabled={!canManage} /></div>
                    <div><label style={label}>Colour</label><input style={{ ...field, padding: 3, height: 38 }} type="color" value={f.v.themeColor || '#0B6E4F'} onChange={f.set('themeColor')} disabled={!canManage} /></div>
                </div>
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.pickupEnabled} onChange={f.set('pickupEnabled')} disabled={!canManage} /> Pickup</label>
                {f.v.pickupEnabled && <div><label style={label}>Where and when to collect</label><input style={field} value={f.v.pickupNote || ''} onChange={f.set('pickupNote')} maxLength={300} disabled={!canManage} /></div>}
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.deliveryEnabled} onChange={f.set('deliveryEnabled')} disabled={!canManage} /> Delivery</label>
                {f.v.deliveryEnabled && <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div><label style={label}>Delivery fee</label><input style={field} type="number" min="0" step="0.01" value={f.v.deliveryFee} onChange={f.set('deliveryFee')} disabled={!canManage} /></div>
                        <div><label style={label}>Free delivery from</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.freeFrom} onChange={f.set('freeFrom')} disabled={!canManage} /></div>
                    </div>
                    <div><label style={label}>Delivery areas and times</label><input style={field} value={f.v.deliveryNote || ''} onChange={f.set('deliveryNote')} maxLength={300} disabled={!canManage} /></div>
                </>}
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.open} onChange={f.set('open')} disabled={!canManage} /> Taking orders</label>
                {canManage && <div><button type="submit" className="btn btn-primary" disabled={f.busy}>{f.busy ? 'Saving…' : 'Save'}</button></div>}
            </form>
        </Section>
    );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function Store() {
    const [tab, setTab] = useState('Overview');
    const [startNew, setStartNew] = useState(false);
    const [forProduct, setForProduct] = useState(null);
    const [ov, setOv] = useState(null);
    const [error, setError] = useState('');
    const load = () => storeApi.overview().then(r => { setOv(data(r)); setError(''); }).catch(e => setError(errorMessage(e, 'The store could not be reached')));
    useEffect(() => { load(); }, []);
    const canManage = storeSession()?.canManage ?? false;
    const currencies = ov?.currencies?.length ? ov.currencies : ['USD'];
    const go = (t, isNew) => { setStartNew(!!isNew); setTab(t); };
    return (
        <Page title="Store" actions={
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', padding: 4, borderRadius: 12 }}>
                {TABS.map(t => (
                    <button key={t} onClick={() => { setStartNew(false); setForProduct(null); setTab(t); if (t === 'Overview') load(); }} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 12px', fontSize: 12.5, border: 'none' }}>{t}</button>
                ))}
            </div>
        }>
            {error && <Notice kind="error">{error} <button className="btn btn-ghost" style={{ marginLeft: 8, padding: '4px 10px', fontSize: 12 }} onClick={load}>Try again</button></Notice>}
            {tab === 'Overview' && <Overview ov={ov} go={go} />}
            {tab === 'Products' && <Products canManage={canManage} currencies={currencies} startNew={startNew} onLink={(p) => { setForProduct(p); setTab('Links'); }} />}
            {tab === 'Links' && <Links key={forProduct?.id || (startNew ? 'new' : 'list')} canManage={canManage} currencies={currencies} startNew={startNew} forProduct={forProduct} clearProduct={() => setForProduct(null)} />}
            {tab === 'Orders' && <Orders canManage={canManage} />}
            {tab === 'Customers' && <Customers />}
            {tab === 'Settings' && ov?.store && <Settings store={ov.store} canManage={canManage} onSaved={(s) => setOv(o => ({ ...o, store: s }))} />}
        </Page>
    );
}
