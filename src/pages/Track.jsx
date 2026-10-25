import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackApi, errorMessage } from '../lib/api.js';

const STATUS = {
    PENDING: { label: 'Submitted', color: '#F59E0B', text: 'Your application has been received and is waiting for review.' },
    UNDER_REVIEW: { label: 'Under review', color: '#06A3DA', text: 'Our team is reviewing your application.' },
    UPDATE_REQUIRED: { label: 'Action needed', color: '#E53E3E', text: 'We need more information or documents from you. Sign in to see what is needed and upload it.' },
    ACTIVE: { label: 'Approved', color: '#2F855A', text: 'Your application is approved. Sign in to start accepting payments.' },
    APPROVED: { label: 'Approved', color: '#2F855A', text: 'Your application is approved. Sign in to start accepting payments.' },
    REJECTED: { label: 'Not approved', color: '#E53E3E', text: 'Your application was not approved. Sign in to see the reason.' },
    SUSPENDED: { label: 'Suspended', color: '#E53E3E', text: 'This merchant account is suspended. Please contact PayPort.' },
};

export default function Track() {
    const [params] = useSearchParams();
    const [reference, setReference] = useState(params.get('ref') || '');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const look = async (ref) => {
        if (!ref.trim()) return;
        setError(''); setResult(null); setLoading(true);
        try {
            const r = await trackApi.status(ref);
            setResult(r.data?.data || r.data);
        } catch (e) {
            setError(e?.response?.status === 404 ? 'No application found with that reference. Check it and try again.' : errorMessage(e, 'Could not check the application right now.'));
        } finally { setLoading(false); }
    };
    useEffect(() => { if (params.get('ref')) look(params.get('ref')); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const s = result ? (STATUS[result.status] || { label: result.status, color: '#64748B', text: '' }) : null;
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 460, padding: 36 }}>
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                    <img src="/favicon.png" alt="" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 12 }} />
                    <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Track your application</h1>
                </div>
                <form onSubmit={e => { e.preventDefault(); look(reference); }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }} htmlFor="ref">Application reference</label>
                    <input id="ref" value={reference} onChange={e => setReference(e.target.value)}
                        style={{ width: '100%', marginBottom: 14, fontFamily: 'monospace', textTransform: 'uppercase' }} autoFocus />
                    <button type="submit" disabled={loading || !reference.trim()} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
                        {loading ? 'Checking…' : 'Check status'}
                    </button>
                </form>
                {error && <div role="alert" style={{ background: 'var(--badge-red)', color: 'var(--red)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginTop: 16 }}>{error}</div>}
                {s && (
                    <div style={{ marginTop: 20, padding: 16, borderRadius: 12, border: `1.5px solid ${s.color}` }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{result.applicationReference}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: '4px 0 8px' }}>{s.label}</div>
                        {s.text && <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 14px' }}>{s.text}</p>}
                        <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                            {result.status === 'UPDATE_REQUIRED' ? 'Sign in to upload documents' : 'Sign in'}
                        </Link>
                    </div>
                )}
                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 18 }}>
                    New business? <Link to="/signup">Apply for a merchant account</Link>
                </p>
            </div>
        </div>
    );
}
