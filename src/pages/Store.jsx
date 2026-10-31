import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Page, Section, Table, Notice, Badge, minor, show } from '../components/kit';
import { storeApi, imageUrl, storeSession, STORE_BASE } from '../lib/commerce';

const STORE_HOST = STORE_BASE.replace(/^https?:\/\//, '');
import { errorMessage, paymentMethodsApi } from '../lib/api';
import Share from './store/Share.jsx';

const TABS = ['Overview', 'Products', 'Collections', 'Discounts', 'Links', 'Orders', 'Bookings', 'Reviews', 'Customers', 'Reports', 'Offers', 'Settings'];
const CHANNEL_NAMES = { WEB: 'Website', APP: 'App', WHATSAPP: 'WhatsApp', USSD: 'USSD' };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const METHOD_NAMES = { ECOCASH: 'EcoCash', ONEMONEY: 'OneMoney', OMARI: 'Omari', INNBUCKS: 'InnBucks', ZIMSWITCH: 'Card' };
const TYPES = [['SHOP', 'Shop'], ['CLOTHING', 'Clothing and shoes'], ['FOOD', 'Food'], ['DRINKS', 'Drinks'], ['SERVICES', 'Services'], ['BEAUTY', 'Beauty and hair'], ['ELECTRONICS', 'Phones and electronics'], ['HOME', 'Home and garden'], ['CRAFTS', 'Art and crafts'], ['OTHER', 'Other']];
const DELIVERY_LABEL = { PREPARING: 'Preparing', READY: 'Ready to collect', OUT: 'Out for delivery', DELIVERED: 'Delivered', COLLECTED: 'Collected', NOT_NEEDED: '—' };
const NEXT_STEP = { DELIVERY: { PREPARING: ['OUT', 'Out for delivery'], OUT: ['DELIVERED', 'Delivered'] }, PICKUP: { PREPARING: ['READY', 'Ready to collect'], READY: ['COLLECTED', 'Collected'] } };
const PAYMENT_LABEL = { NOT_STARTED: 'Not paid', AWAITING_PAYMENT: 'Not paid', PENDING: 'Being confirmed', CONFIRMING: 'Being confirmed', PAID: 'Paid', FAILED: 'Failed', EXPIRED: 'Not paid', ON_DELIVERY: 'Pay on delivery' };
const REFUND_LABEL = { REQUESTED: 'Refund requested', PARTIAL: 'Part refunded', REFUNDED: 'Refunded' };

const data = (r) => r?.data?.data;
const toMinor = (v) => (v === '' || v === null || v === undefined ? null : Math.round(parseFloat(v) * 100));
const field = { width: '100%', padding: 9, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13 };
const label = { fontSize: 12.5, fontWeight: 700, display: 'block', margin: '0 0 5px' };

function PaymentBadge({ status }) {
    const cls = { PAID: 'badge-green', PENDING: 'badge-amber', CONFIRMING: 'badge-amber', ON_DELIVERY: 'badge-amber', FAILED: 'badge-red' }[status] || 'badge-gray';
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

function InsightsPanel() {
    const [x, setX] = useState(null);
    useEffect(() => { storeApi.insights().then(r => setX(data(r))).catch(() => setX(null)); }, []);
    if (!x) return null;
    const list = (rows, render) => rows.length ? rows.map((r, i) => <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{render(r)}</div>) : <div style={{ fontSize: 13, color: 'var(--text-2)' }}>—</div>;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 18 }}>
            <Section title="Best sellers (30 days)">{list(x.bestSellers, r => <>{r.name} · <strong>{r.sold30d}</strong> · {minor(r.revenue30dMinor, r.currency)}</>)}</Section>
            <Section title="Restock">{list(x.restock, r => <>{r.name} · {r.why === 'SOLD_OUT' ? <Badge value="SOLD_OUT" /> : `${r.stock} left, about ${r.daysLeft} days`}</>)}</Section>
            <Section title="Not selling (30 days)">{list(x.notSelling, r => <>{r.name} · {r.stock} in stock</>)}</Section>
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
            <InsightsPanel />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => go('Links', true)}><Plus size={15} /> Payment link</button>
                <button className="btn btn-ghost" onClick={() => go('Products', true)}><Plus size={15} /> Product</button>
            </div>
        </>
    );
}

// ─── products ────────────────────────────────────────────────────────────────

function ProductForm({ product, currencies, collections, onClose, onDone }) {
    const f = useForm({
        name: product?.name || '', description: product?.description || '', price: product ? (product.priceMinor / 100).toFixed(2) : '',
        currency: product?.currency || currencies[0] || 'USD', imageId: product?.imageId || null, visible: product ? product.status === 'ACTIVE' : true,
        stock: product?.stock ?? '', category: product?.category || '', kind: product?.kind || 'GOODS',
        was: product?.compareAtMinor != null ? (product.compareAtMinor / 100).toFixed(2) : '', featured: !!product?.featured, collectionIds: product?.collectionIds || [], duration: product?.durationMin ?? '',
    }, (v) => {
        const b = { name: v.name, description: v.description, priceMinor: toMinor(v.price), currency: v.currency, imageId: v.imageId, status: v.visible ? 'ACTIVE' : 'HIDDEN',
            stock: v.kind === 'SERVICE' || v.stock === '' ? null : Number(v.stock), category: v.category || null, kind: v.kind, compareAtMinor: toMinor(v.was),
            featured: !!v.featured, collectionIds: v.collectionIds, durationMin: v.kind === 'SERVICE' && v.duration !== '' ? Number(v.duration) : null };
        return product ? storeApi.saveProduct(product.id, b) : storeApi.createProduct(b);
    }, (d) => { onDone(d); onClose(); });
    const [writing, setWriting] = useState(false);
    const write = async () => {
        setWriting(true);
        try {
            const r = data(await storeApi.describe({ name: f.v.name, category: f.v.category, kind: f.v.kind, notes: f.v.description }));
            f.set('description')(r.description);
        } catch (e) { toast.error(errorMessage(e, 'Could not write it')); }
        finally { setWriting(false); }
    };
    return (
        <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose} onSubmit={f.submit} busy={f.busy} error={f.error}>
            <div style={{ display: 'flex', gap: 6 }}>
                {[['GOODS', 'Product'], ['SERVICE', 'Service']].map(([k, l]) => (
                    <button key={k} type="button" className={`btn ${f.v.kind === k ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, padding: '7px 10px', fontSize: 12.5 }} onClick={() => f.set('kind')(k)}>{l}</button>
                ))}
            </div>
            <PictureField value={f.v.imageId} onChange={f.set('imageId')} />
            <div><label style={label}>Name</label><input style={field} value={f.v.name} onChange={f.set('name')} required maxLength={120} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
                <div><label style={label}>Price</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.price} onChange={f.set('price')} required /></div>
                <div><label style={label}>Was (sale)</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.was} onChange={f.set('was')} /></div>
                <div><label style={label}>Currency</label><select style={field} value={f.v.currency} onChange={f.set('currency')}>{currencies.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            {f.v.kind === 'SERVICE' && <div><label style={label}>Takes (minutes)</label><input style={field} type="number" min="5" max="720" step="5" value={f.v.duration} onChange={f.set('duration')} placeholder="60" /></div>}
            {f.v.kind === 'GOODS' && <div><label style={label}>In stock</label><input style={field} type="number" min="0" step="1" value={f.v.stock} onChange={f.set('stock')} placeholder="Not counted" /></div>}
            {collections.length > 0 && <div><label style={label}>Collections</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {collections.map(c => {
                        const on = f.v.collectionIds.includes(c.id);
                        return <button key={c.id} type="button" className={`btn ${on ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '5px 11px', fontSize: 12.5 }}
                            onClick={() => f.set('collectionIds')(on ? f.v.collectionIds.filter(x => x !== c.id) : [...f.v.collectionIds, c.id])}>{c.name}</button>;
                    })}
                </div></div>}
            <div><label style={label}>Category</label><input style={field} value={f.v.category} onChange={f.set('category')} maxLength={40} /></div>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={label}>Description</label>
                    <button type="button" className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} disabled={writing || !f.v.name} onClick={write}>{writing ? 'Writing…' : 'Write with AI'}</button>
                </div>
                <textarea style={{ ...field, minHeight: 90 }} value={f.v.description} onChange={f.set('description')} maxLength={2000} />
            </div>
            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.v.visible} onChange={f.set('visible')} /> On sale</label>
            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={f.v.featured} onChange={f.set('featured')} /> Featured on the front page</label>
        </Modal>
    );
}

function Products({ canManage, currencies, startNew, onLink }) {
    const [rows, setRows] = useState(null);
    const [edit, setEdit] = useState(startNew ? 'new' : null);
    const [collections, setCollections] = useState([]);
    const load = () => storeApi.products().then(r => setRows(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); storeApi.collections().then(r => setCollections(data(r) || [])).catch(() => setCollections([])); }, []);
    return (
        <Section title="Products" right={canManage && <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setEdit('new')}><Plus size={14} /> New product</button>}>
            <Table rows={rows || []} noExport empty={rows ? 'No products yet.' : 'Loading…'} onRow={canManage ? (p) => setEdit(p) : undefined} columns={[
                { key: 'pic', label: '', render: p => p.imageId ? <img src={imageUrl(p.imageId)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} /> : null },
                { key: 'name', label: 'Product', render: p => <>{p.name}{p.featured && <> <span className="badge badge-green">Featured</span></>}{p.kind === 'SERVICE' && <> <span className="badge badge-gray">Service</span></>}</> },
                { key: 'price', label: 'Price', render: p => <>{p.currency} {p.price}{p.compareAtMinor != null && <span style={{ color: 'var(--text-2)', textDecoration: 'line-through', marginLeft: 6 }}>{(p.compareAtMinor / 100).toFixed(2)}</span>}</> },
                { key: 'stock', label: 'In stock', render: p => p.stock == null ? '—' : p.stock === 0 ? <Badge value="SOLD_OUT" /> : p.stock },
                { key: 'status', label: 'Status', render: p => <Badge value={p.status === 'ACTIVE' ? 'ON_SALE' : 'HIDDEN'} /> },
                { key: 'share', label: '', render: p => (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <Share url={p.url} text={`${p.name} - ${p.currency} ${p.price}`} compact />
                        {canManage && <button className="btn btn-ghost" style={{ padding: '5px 9px', fontSize: 12.5 }} onClick={() => onLink(p)}>Payment link</button>}
                    </div>
                ) },
            ]} />
            {edit && <ProductForm product={edit === 'new' ? null : edit} currencies={currencies} collections={collections} onClose={() => setEdit(null)} onDone={load} />}
        </Section>
    );
}

// ─── collections ─────────────────────────────────────────────────────────────

function Collections({ canManage }) {
    const [rows, setRows] = useState(null);
    const [name, setName] = useState('');
    const load = () => storeApi.collections().then(r => setRows(data(r) || [])).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    const run = async (fn, ok) => { try { await fn(); toast.success(ok); load(); return true; } catch (e) { toast.error(errorMessage(e, 'Could not change')); return false; } };
    const move = (i, d) => {
        const list = [...rows];
        const [x] = list.splice(i, 1);
        list.splice(i + d, 0, x);
        run(() => Promise.all(list.map((c, n) => storeApi.moveCollection(c.id, n + 1))), 'Saved');
    };
    return (
        <Section title="Collections">
            {canManage && (
                <form onSubmit={async e => { e.preventDefault(); if (await run(() => storeApi.addCollection(name), 'Added')) setName(''); }} style={{ display: 'flex', gap: 8, marginBottom: 12, maxWidth: 520 }}>
                    <input style={field} placeholder="Men, Women, Kids, Breakfast, Hair…" value={name} onChange={e => setName(e.target.value)} required maxLength={60} />
                    <button className="btn btn-primary" type="submit"><Plus size={14} /> Add</button>
                </form>
            )}
            <Table rows={rows || []} noExport empty={rows ? 'No collections yet.' : 'Loading…'} columns={[
                { key: 'name', label: 'Collection' },
                { key: 'products', label: 'Products' },
                { key: 'actions', label: '', render: (c) => canManage && (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 12.5 }} disabled={rows.indexOf(c) === 0} onClick={() => move(rows.indexOf(c), -1)}>↑</button>
                        <button className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 12.5 }} disabled={rows.indexOf(c) === rows.length - 1} onClick={() => move(rows.indexOf(c), 1)}>↓</button>
                        <button className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 12.5 }} onClick={() => window.confirm('Are you sure?') && run(() => storeApi.removeCollection(c.id), 'Removed')}>Remove</button>
                    </div>
                ) },
            ]} />
        </Section>
    );
}

// ─── discounts ───────────────────────────────────────────────────────────────

function DiscountForm({ currencies, onClose, onDone }) {
    const f = useForm({ code: '', kind: 'PERCENT', value: '', min: '', ends: '', maxUses: '' }, (v) => storeApi.addDiscount({
        code: v.code, kind: v.kind, value: v.kind === 'PERCENT' ? Number(v.value) : toMinor(v.value), minOrderMinor: toMinor(v.min), endsAt: v.ends || null, maxUses: v.maxUses === '' ? null : Number(v.maxUses),
    }), (d) => { onDone(d); onClose(); });
    return (
        <Modal title="New discount code" submitLabel="Create code" onClose={onClose} onSubmit={f.submit} busy={f.busy} error={f.error}>
            <div style={{ display: 'flex', gap: 6 }}>
                {[['PERCENT', 'Percentage off'], ['AMOUNT', `Amount off (${currencies[0] || 'USD'})`]].map(([k, l]) => (
                    <button key={k} type="button" className={`btn ${f.v.kind === k ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, padding: '7px 10px', fontSize: 12.5 }} onClick={() => f.set('kind')(k)}>{l}</button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={label}>Code</label><input style={{ ...field, textTransform: 'uppercase' }} value={f.v.code} onChange={f.set('code')} required maxLength={30} pattern="[A-Za-z0-9_-]{3,30}" /></div>
                <div><label style={label}>{f.v.kind === 'PERCENT' ? '% off' : 'Amount off'}</label>
                    <input style={field} type="number" min={f.v.kind === 'PERCENT' ? 1 : 0.01} max={f.v.kind === 'PERCENT' ? 90 : undefined} step={f.v.kind === 'PERCENT' ? 1 : 0.01} value={f.v.value} onChange={f.set('value')} required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={label}>Minimum order</label><input style={field} type="number" min="0.01" step="0.01" value={f.v.min} onChange={f.set('min')} /></div>
                <div><label style={label}>Ends</label><input style={field} type="date" value={f.v.ends} onChange={f.set('ends')} min={new Date().toISOString().slice(0, 10)} /></div>
                <div><label style={label}>Uses</label><input style={field} type="number" min="1" step="1" value={f.v.maxUses} onChange={f.set('maxUses')} placeholder="No limit" /></div>
            </div>
        </Modal>
    );
}

function Discounts({ canManage, currencies }) {
    const [rows, setRows] = useState(null);
    const [creating, setCreating] = useState(false);
    const load = () => storeApi.discounts().then(r => setRows(data(r) || [])).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    const toggle = async (d) => {
        if (!window.confirm('Are you sure?')) return;
        try { await storeApi.setDiscount(d.id, !d.active); toast.success(d.active ? 'Switched off' : 'Switched on'); load(); }
        catch (e) { toast.error(errorMessage(e, 'Could not change')); }
    };
    return (
        <Section title="Discount codes" right={canManage && <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setCreating(true)}><Plus size={14} /> New code</button>}>
            <Table rows={rows || []} noExport empty={rows ? 'No discount codes yet.' : 'Loading…'} columns={[
                { key: 'code', label: 'Code', render: d => <strong>{d.code}</strong> },
                { key: 'value', label: 'Off', render: d => d.kind === 'PERCENT' ? `${d.value}%` : (d.value / 100).toFixed(2) },
                { key: 'minOrderMinor', label: 'Minimum', render: d => d.minOrderMinor != null ? (d.minOrderMinor / 100).toFixed(2) : '—' },
                { key: 'endsAt', label: 'Ends', render: d => d.endsAt ? String(d.endsAt).slice(0, 10) : '—' },
                { key: 'used', label: 'Used', render: d => d.maxUses != null ? `${d.used} / ${d.maxUses}` : d.used },
                { key: 'active', label: 'Status', render: d => <Badge value={d.active ? 'ACTIVE' : 'DISABLED'} /> },
                { key: 'actions', label: '', render: d => canManage && <button className="btn btn-ghost" style={{ padding: '5px 9px', fontSize: 12.5 }} onClick={() => toggle(d)}>{d.active ? 'Switch off' : 'Switch on'}</button> },
            ]} />
            {creating && <DiscountForm currencies={currencies} onClose={() => setCreating(false)} onDone={load} />}
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

// A WhatsApp message to the customer about their order, written for them; the merchant presses send in WhatsApp.
function whatsapp(o) {
    let p = String(o.customerPhone || '').replace(/[^0-9+]/g, '');
    if (!p) return null;
    if (p.startsWith('+')) p = p.slice(1);
    else if (p.startsWith('0')) p = `263${p.slice(1)}`;
    const state = o.orderStatus === 'CANCELLED' ? 'has been cancelled'
        : o.deliveryStatus === 'READY' ? 'is ready to collect'
        : o.deliveryStatus === 'OUT' ? 'is on its way'
        : o.deliveryStatus === 'DELIVERED' || o.deliveryStatus === 'COLLECTED' ? 'is complete. Thank you'
        : o.paymentStatus === 'PAID' ? 'is paid and being prepared'
        : o.paymentStatus === 'ON_DELIVERY' ? `is being prepared. Please have ${minor(o.amountMinor, o.currency)} ready`
        : 'has been received';
    return `https://wa.me/${p}?text=${encodeURIComponent(`Hi${o.customerName ? ` ${o.customerName}` : ''}, your order ${o.orderRef} ${state}.`)}`;
}

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
    const cash = async () => {
        if (!window.confirm('Are you sure?')) return;
        try { await storeApi.cashReceived(orderRef); toast.success('Saved'); load(); onChanged(); }
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
                            {o.booking && <><div style={{ color: 'var(--text-2)' }}>Appointment</div><div style={{ fontWeight: 700 }}>{o.booking}</div></>}
                            {o.deliveryZone && <><div style={{ color: 'var(--text-2)' }}>Area</div><div>{o.deliveryZone}</div></>}
                            {o.discountMinor > 0 && <><div style={{ color: 'var(--text-2)' }}>Discount</div><div>{o.discountCode} · −{minor(o.discountMinor, o.currency)}</div></>}
                            <div style={{ color: 'var(--text-2)' }}>Payment</div><div>{o.payMethod === 'CASH' ? 'Cash on delivery or collection' : `Online${o.payChoice ? ` · ${METHOD_NAMES[o.payChoice] || o.payChoice}` : ''}`}</div>
                            <div style={{ color: 'var(--text-2)' }}>Total</div><div style={{ fontWeight: 800 }}>{minor(o.amountMinor, o.currency)}</div>
                            <div style={{ color: 'var(--text-2)' }}>Customer</div><div>{[o.customerName, o.customerPhone].filter(Boolean).join(' · ') || '—'}
                                {whatsapp(o) && <a className="btn btn-ghost" style={{ marginLeft: 8, padding: '3px 9px', fontSize: 12 }} href={whatsapp(o)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div>
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
                                {o.paymentStatus === 'ON_DELIVERY' && o.orderStatus === 'OPEN' && <button className="btn btn-primary" onClick={cash}>Cash received</button>}
                                {o.paymentStatus === 'ON_DELIVERY' && NEXT_STEP[o.deliveryMethod]?.[o.deliveryStatus] && (
                                    <button className="btn btn-ghost" onClick={() => step(NEXT_STEP[o.deliveryMethod][o.deliveryStatus][0])}>{NEXT_STEP[o.deliveryMethod][o.deliveryStatus][1]}</button>)}
                                {o.paymentStatus === 'PAID' && NEXT_STEP[o.deliveryMethod]?.[o.deliveryStatus] && (
                                    <button className="btn btn-primary" onClick={() => step(NEXT_STEP[o.deliveryMethod][o.deliveryStatus][0])}>{NEXT_STEP[o.deliveryMethod][o.deliveryStatus][1]}</button>)}
                                {o.paymentStatus === 'PAID' && o.orderStatus === 'OPEN' && o.deliveryMethod === 'NONE' && <button className="btn btn-primary" onClick={() => status('FULFILLED')}>Mark fulfilled</button>}
                                {o.paymentStatus === 'PAID' && o.payMethod !== 'CASH' && left > 0 && <button className="btn btn-ghost" onClick={() => setRefund(true)}>Refund</button>}
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
                    <option value="ON_DELIVERY">Pay on delivery</option>
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

const DESIGNS = [['PRODUCT', 'Product', 'Big pictures and prices'], ['BOUTIQUE', 'Boutique', 'Catalogue with categories'], ['LOCAL', 'Local business', 'Menu list, pickup and WhatsApp']];

function Domains({ canManage }) {
    const [rows, setRows] = useState([]);
    const [domain, setDomain] = useState('');
    const load = () => storeApi.domains().then(r => setRows(data(r) || [])).catch(() => setRows([]));
    useEffect(() => { load(); }, []);
    const run = async (fn, ok) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errorMessage(e, 'Could not change')); } };
    return (
        <Section title="Your own domain">
            {canManage && (
                <form onSubmit={e => { e.preventDefault(); run(() => storeApi.addDomain(domain), 'Added').then(() => setDomain('')); }} style={{ display: 'flex', gap: 8, marginBottom: 12, maxWidth: 560 }}>
                    <input style={field} placeholder="shop.yourbusiness.co.zw" value={domain} onChange={e => setDomain(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">Add</button>
                </form>
            )}
            {rows.map(d => (
                <div key={d.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{d.domain}</strong>
                        <Badge value={d.status} />
                    </div>
                    {d.status !== 'VERIFIED' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px', fontSize: 12.5, margin: '10px 0' }}>
                            <span style={{ color: 'var(--text-2)' }}>CNAME</span><code>{d.domain} → {STORE_HOST}</code>
                            <span style={{ color: 'var(--text-2)' }}>TXT</span><code style={{ wordBreak: 'break-all' }}>{d.txtName} = {d.txtValue}</code>
                        </div>
                    )}
                    {d.lastError && d.status !== 'VERIFIED' && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{d.lastError}</div>}
                    {canManage && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            {d.status !== 'VERIFIED' && <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => run(() => storeApi.verifyDomain(d.id), 'Checked')}>Check</button>}
                            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => window.confirm('Are you sure?') && run(() => storeApi.removeDomain(d.id), 'Removed')}>Remove</button>
                        </div>
                    )}
                </div>
            ))}
        </Section>
    );
}

// ─── bookings and reviews ────────────────────────────────────────────────────

function Bookings() {
    const [rows, setRows] = useState(null);
    useEffect(() => { storeApi.bookings().then(r => setRows(data(r) || [])).catch(e => toast.error(errorMessage(e, 'Could not load'))); }, []);
    return (
        <Section title="Bookings">
            <Table rows={rows || []} exportName="Store bookings" empty={rows ? 'No bookings yet.' : 'Loading…'} columns={[
                { key: 'when', label: 'When' },
                { key: 'service', label: 'Service' },
                { key: 'customer', label: 'Customer', render: b => [b.customerName, b.customerPhone].filter(Boolean).join(' · ') || '—' },
                { key: 'paymentStatus', label: 'Payment', render: b => <PaymentBadge status={b.paymentStatus} /> },
                { key: 'status', label: 'Booking', render: b => <Badge value={b.status === 'CONFIRMED' ? 'ACTIVE' : 'PENDING'} /> },
                { key: 'orderRef', label: 'Order' },
            ]} />
        </Section>
    );
}

function Reviews({ canManage }) {
    const [rows, setRows] = useState(null);
    const load = () => storeApi.reviews().then(r => setRows(data(r) || [])).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    const save = async (r, b, ok) => {
        try { setRows(data(await storeApi.updateReview(r.id, b)) || []); toast.success(ok); }
        catch (e) { toast.error(errorMessage(e, 'Could not change')); }
    };
    return (
        <Section title="Reviews">
            {rows && rows.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>No reviews yet.</div>}
            {(rows || []).map(r => (
                <div key={r.id} className="card" style={{ padding: 14, marginBottom: 10, opacity: r.hidden ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.product}</strong>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.name || 'A customer'} · {String(r.createdAt).slice(0, 10)} · {r.orderRef}</span>
                    </div>
                    {r.comment && <div style={{ fontSize: 13.5, margin: '6px 0' }}>{r.comment}</div>}
                    {r.reply && <div style={{ fontSize: 13, color: 'var(--text-2)', borderLeft: '3px solid var(--border)', paddingLeft: 8 }}>{r.reply}</div>}
                    {canManage && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => {
                                const reply = window.prompt('Reply', r.reply || '');
                                if (reply !== null) save(r, { reply }, 'Saved');
                            }}>{r.reply ? 'Edit reply' : 'Reply'}</button>
                            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => window.confirm('Are you sure?') && save(r, { hidden: !r.hidden }, r.hidden ? 'Shown' : 'Hidden')}>{r.hidden ? 'Show' : 'Hide'}</button>
                        </div>
                    )}
                </div>
            ))}
        </Section>
    );
}

// ─── reports and offers ──────────────────────────────────────────────────────

function Reports() {
    const [days, setDays] = useState(30);
    const [r, setR] = useState(null);
    useEffect(() => { setR(null); storeApi.reports(days).then(x => setR(data(x))).catch(e => toast.error(errorMessage(e, 'Could not load'))); }, [days]);
    const m = (v, c) => minor(v, c);
    return (
        <>
            <Section title="Sales" right={
                <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ ...field, width: 150 }}>
                    {[7, 30, 90, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}
                </select>}>
                {!r ? 'Loading…' : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                        {(r.totals.length ? r.totals : [{ currency: 'USD', orders: 0, salesMinor: 0 }]).map(t => <Stat key={t.currency} title={`Sales (${t.currency})`} value={m(t.salesMinor)} sub={`${t.orders} paid orders`} />)}
                        <Stat title="Customers" value={r.customers} sub={`${r.returningCustomers} came back`} />
                        <Stat title="Agreed to offers" value={r.audience} />
                    </div>
                )}
            </Section>
            {r && <>
                <Section title="By day"><Table rows={r.byDay} exportName="Sales by day" empty="No sales yet." columns={[
                    { key: 'day', label: 'Day', render: x => String(x.day).slice(0, 10) }, { key: 'orders', label: 'Orders' }, { key: 'salesMinor', label: 'Sales', render: x => m(x.salesMinor, x.currency) }]} /></Section>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                    <Section title="Best sellers"><Table rows={r.topItems} exportName="Best sellers" empty="—" columns={[
                        { key: 'name', label: 'Item' }, { key: 'sold', label: 'Sold' }, { key: 'salesMinor', label: 'Sales', render: x => m(x.salesMinor, x.currency) }]} /></Section>
                    <Section title="By channel"><Table rows={r.byChannel} exportName="Sales by channel" empty="—" columns={[
                        { key: 'channel', label: 'Channel', render: x => CHANNEL_NAMES[x.channel] || x.channel }, { key: 'orders', label: 'Orders' }, { key: 'salesMinor', label: 'Sales', render: x => m(x.salesMinor, x.currency) }]} /></Section>
                    <Section title="By payment"><Table rows={r.byPayment} exportName="Sales by payment" empty="—" columns={[
                        { key: 'method', label: 'Paid with', render: x => x.method === 'CASH' ? 'Cash on delivery' : METHOD_NAMES[x.method] || 'Online' }, { key: 'orders', label: 'Orders' }, { key: 'salesMinor', label: 'Sales', render: x => m(x.salesMinor, x.currency) }]} /></Section>
                    <Section title="Discount codes used"><Table rows={r.discounts} exportName="Discount codes used" empty="—" columns={[
                        { key: 'code', label: 'Code' }, { key: 'orders', label: 'Orders' }, { key: 'discountMinor', label: 'Given', render: x => m(x.discountMinor, x.currency) }]} /></Section>
                </div>
            </>}
        </>
    );
}

function Offers({ canManage }) {
    const [x, setX] = useState(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const load = () => storeApi.campaigns().then(r => setX(data(r))).catch(e => toast.error(errorMessage(e, 'Could not load')));
    useEffect(() => { load(); }, []);
    const send = async (e) => {
        e.preventDefault();
        if (!window.confirm('Are you sure?')) return;
        setBusy(true);
        try { const r = data(await storeApi.sendCampaign(text)); toast.success(`Sent to ${r.recipients}`); setText(''); load(); }
        catch (err) { toast.error(errorMessage(err, 'Could not send')); }
        finally { setBusy(false); }
    };
    return (
        <Section title="Offers by SMS">
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>{x ? `${x.audience} customers agreed to offers` : ''}</div>
            {canManage && (
                <form onSubmit={send} style={{ display: 'grid', gap: 8, maxWidth: 560, marginBottom: 16 }}>
                    <textarea style={{ ...field, minHeight: 70 }} maxLength={120} value={text} onChange={e => setText(e.target.value)} placeholder="20% off all drinks this weekend" required />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{text.length}/120</span>
                        <button className="btn btn-primary" type="submit" disabled={busy || !x?.audience}>{busy ? 'Sending…' : 'Send offer'}</button>
                    </div>
                </form>
            )}
            <Table rows={x?.campaigns || []} noExport empty="No offers sent yet." columns={[
                { key: 'createdAt', label: 'Sent', render: c => show(c.createdAt).slice(0, 16) }, { key: 'text', label: 'Offer' }, { key: 'recipients', label: 'To' }]} />
        </Section>
    );
}

// ─── payment methods, delivery areas, opening hours ──────────────────────────

function PaymentMethods({ canManage }) {
    const [rows, setRows] = useState(null);
    const load = () => paymentMethodsApi.list().then(r => setRows(data(r) || [])).catch(() => setRows([]));
    useEffect(() => { load(); }, []);
    const toggle = async (m) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            setRows(data(await paymentMethodsApi.set({ [m.code]: !m.enabled })) || []);
            await storeApi.refreshMethods().catch(() => null);
            toast.success(m.enabled ? 'Switched off' : 'Switched on');
        } catch (e) { toast.error(errorMessage(e, 'Could not change')); }
    };
    return (
        <Section title="Payment methods">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {(rows || []).map(m => (
                    <label key={m.code} className="card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', cursor: canManage ? 'pointer' : 'default' }}>
                        <input type="checkbox" checked={!!m.enabled} disabled={!canManage} onChange={() => toggle(m)} />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
                    </label>
                ))}
            </div>
        </Section>
    );
}

function Zones({ canManage }) {
    const [rows, setRows] = useState([]);
    const [v, setV] = useState({ name: '', fee: '', free: '' });
    const load = () => storeApi.zones().then(r => setRows(data(r) || [])).catch(() => setRows([]));
    useEffect(() => { load(); }, []);
    const add = async (e) => {
        e.preventDefault();
        try { setRows(data(await storeApi.addZone({ name: v.name, feeMinor: toMinor(v.fee) || 0, freeFromMinor: toMinor(v.free) })) || []); setV({ name: '', fee: '', free: '' }); toast.success('Added'); }
        catch (err) { toast.error(errorMessage(err, 'Could not add')); }
    };
    const remove = async (z) => {
        if (!window.confirm('Are you sure?')) return;
        try { setRows(data(await storeApi.removeZone(z.id)) || []); toast.success('Removed'); }
        catch (err) { toast.error(errorMessage(err, 'Could not remove')); }
    };
    return (
        <Section title="Delivery areas">
            {canManage && (
                <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 12, maxWidth: 640 }}>
                    <input style={field} placeholder="Avondale" value={v.name} onChange={e => setV({ ...v, name: e.target.value })} required maxLength={60} />
                    <input style={field} type="number" min="0" step="0.01" placeholder="Fee" value={v.fee} onChange={e => setV({ ...v, fee: e.target.value })} />
                    <input style={field} type="number" min="0.01" step="0.01" placeholder="Free from" value={v.free} onChange={e => setV({ ...v, free: e.target.value })} />
                    <button className="btn btn-primary" type="submit"><Plus size={14} /> Add</button>
                </form>
            )}
            <Table rows={rows} noExport empty="No areas: one delivery fee for everywhere." columns={[
                { key: 'name', label: 'Area' },
                { key: 'feeMinor', label: 'Fee', render: z => (z.feeMinor / 100).toFixed(2) },
                { key: 'freeFromMinor', label: 'Free from', render: z => z.freeFromMinor != null ? (z.freeFromMinor / 100).toFixed(2) : '—' },
                { key: 'actions', label: '', render: z => canManage && <button className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 12.5 }} onClick={() => remove(z)}>Remove</button> },
            ]} />
        </Section>
    );
}

function Hours({ canManage }) {
    const [staff, setStaff] = useState(1);
    const [days, setDays] = useState(DAYS.map((_, i) => ({ weekday: i + 1, on: false, opens: '08:00', closes: '17:00' })));
    useEffect(() => {
        storeApi.hours().then(r => {
            const h = data(r) || {};
            setStaff(h.staff || 1);
            setDays(DAYS.map((_, i) => {
                const d = (h.days || []).find(x => x.weekday === i + 1);
                return d ? { weekday: i + 1, on: true, opens: String(d.opens).slice(0, 5), closes: String(d.closes).slice(0, 5) } : { weekday: i + 1, on: false, opens: '08:00', closes: '17:00' };
            }));
        }).catch(() => null);
    }, []);
    const set = (i, k, val) => setDays(ds => ds.map((d, n) => (n === i ? { ...d, [k]: val } : d)));
    const save = async (e) => {
        e.preventDefault();
        try {
            await storeApi.setHours({ staff: Number(staff), days: days.filter(d => d.on).map(d => ({ weekday: d.weekday, opens: d.opens, closes: d.closes })) });
            toast.success('Saved');
        } catch (err) { toast.error(errorMessage(err, 'Could not save')); }
    };
    return (
        <Section title="Opening hours for bookings">
            <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
                {days.map((d, i) => (
                    <div key={d.weekday} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: 8, alignItems: 'center' }}>
                        <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={d.on} disabled={!canManage} onChange={e => set(i, 'on', e.target.checked)} /> {DAYS[i]}</label>
                        <input style={field} type="time" value={d.opens} disabled={!canManage || !d.on} onChange={e => set(i, 'opens', e.target.value)} />
                        <input style={field} type="time" value={d.closes} disabled={!canManage || !d.on} onChange={e => set(i, 'closes', e.target.value)} />
                    </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, alignItems: 'center' }}>
                    <label style={label}>People serving at the same time</label>
                    <input style={field} type="number" min="1" max="50" value={staff} disabled={!canManage} onChange={e => setStaff(e.target.value)} />
                </div>
                {canManage && <div><button type="submit" className="btn btn-primary">Save</button></div>}
            </form>
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
            deliveryFeeMinor: toMinor(v.deliveryFee) || 0, freeDeliveryFromMinor: toMinor(v.freeFrom), design: v.design, bannerImage: v.bannerImage, tagline: v.tagline,
            businessType: v.businessType || 'SHOP', announcement: v.announcement || null, codEnabled: !!v.codEnabled, listed: !!v.listed,
            alertsEnabled: !!v.alertsEnabled, customerSms: !!v.customerSms, cartReminders: !!v.cartReminders, loyaltyEnabled: !!v.loyaltyEnabled });
    }, onSaved);
    const base = useMemo(() => (store.url || '').replace(/[^/]*$/, ''), [store.url]);
    return (
        <Section title="Store">
            {f.error && <Notice kind="error">{f.error}</Notice>}
            <form onSubmit={f.submit} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
                <div><label style={label}>What you sell</label>
                    <select style={field} value={f.v.businessType || 'SHOP'} onChange={f.set('businessType')} disabled={!canManage}>{TYPES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
                <div><label style={label}>Design</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {DESIGNS.map(([k, t, d]) => (
                            <button type="button" key={k} disabled={!canManage} onClick={() => f.set('design')(k)} className="card"
                                style={{ padding: 12, textAlign: 'left', cursor: 'pointer', border: f.v.design === k ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 800, fontSize: 13 }}>{t}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{d}</div>
                            </button>
                        ))}
                    </div></div>
                <div><label style={label}>Logo</label><PictureField value={f.v.logoImage} onChange={f.set('logoImage')} /></div>
                <div><label style={label}>Banner</label><PictureField value={f.v.bannerImage} onChange={f.set('bannerImage')} /></div>
                <div><label style={label}>Announcement</label><input style={field} value={f.v.announcement || ''} onChange={f.set('announcement')} maxLength={200} placeholder="Free delivery this weekend" disabled={!canManage} /></div>
                <div><label style={label}>Tagline</label><input style={field} value={f.v.tagline || ''} onChange={f.set('tagline')} maxLength={120} disabled={!canManage} /></div>
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
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.codEnabled} onChange={f.set('codEnabled')} disabled={!canManage} /> Pay on delivery or collection</label>
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.alertsEnabled} onChange={f.set('alertsEnabled')} disabled={!canManage} /> Text me about new orders</label>
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.customerSms} onChange={f.set('customerSms')} disabled={!canManage} /> Text customers when their order is confirmed or ready</label>
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.loyaltyEnabled} onChange={f.set('loyaltyEnabled')} disabled={!canManage} /> Loyalty points</label>
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.cartReminders} onChange={f.set('cartReminders')} disabled={!canManage} /> Cart reminders</label>
                <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!f.v.listed} onChange={f.set('listed')} disabled={!canManage} /> Listed on PayPort Store</label>
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
            {tab === 'Collections' && <Collections canManage={canManage} />}
            {tab === 'Discounts' && <Discounts canManage={canManage} currencies={currencies} />}
            {tab === 'Links' && <Links key={forProduct?.id || (startNew ? 'new' : 'list')} canManage={canManage} currencies={currencies} startNew={startNew} forProduct={forProduct} clearProduct={() => setForProduct(null)} />}
            {tab === 'Orders' && <Orders canManage={canManage} />}
            {tab === 'Bookings' && <Bookings />}
            {tab === 'Reviews' && <Reviews canManage={canManage} />}
            {tab === 'Customers' && <Customers />}
            {tab === 'Reports' && <Reports />}
            {tab === 'Offers' && <Offers canManage={canManage} />}
            {tab === 'Settings' && ov?.store && <Settings store={ov.store} canManage={canManage} onSaved={(s) => setOv(o => ({ ...o, store: s }))} />}
            {tab === 'Settings' && ov?.store && <PaymentMethods canManage={canManage} />}
            {tab === 'Settings' && ov?.store && <Zones canManage={canManage} />}
            {tab === 'Settings' && ov?.store && <Hours canManage={canManage} />}
            {tab === 'Settings' && ov?.store && <Domains canManage={canManage} />}
        </Page>
    );
}
