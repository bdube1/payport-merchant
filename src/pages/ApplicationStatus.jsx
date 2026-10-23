import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, Upload, FileText, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { applicationApi, documentsApi, DOC_TYPES } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';

const STATUS_CONFIG = {
    PENDING: { label: 'Submitted', color: '#F59E0B', desc: "We've received your application and it's in the queue for review." },
    UNDER_REVIEW: { label: 'Under Review', color: '#06A3DA', desc: 'Our team is actively reviewing your application.' },
    UPDATE_REQUIRED: { label: 'Action Needed', color: '#E53E3E', desc: 'We need something from you before we can continue — see below.' },
    REJECTED: { label: 'Not Approved', color: '#E53E3E', desc: null },
};


export default function ApplicationStatus() {
    const { logout } = useAuth();
    const [data, setData] = useState(null);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadType, setUploadType] = useState('CERTIFICATE_OF_INCORPORATION');
    const [uploading, setUploading] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([applicationApi.getStatus(), documentsApi.list()])
            .then(([statusRes, docsRes]) => {
                setData(statusRes.data?.data || statusRes.data);
                setDocs(docsRes.data?.data || docsRes.data || []);
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await documentsApi.upload(uploadType, file);
            toast.success('Document uploaded');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const resolveNote = async (noteId) => {
        try {
            await applicationApi.resolveNote(noteId);
            toast.success("Marked as addressed — we'll take another look");
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update');
        }
    };

    if (loading || !data) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>;
    }

    const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.PENDING;
    const openNotes = (data.reviewNotes || []).filter(n => n.status === 'OPEN');
    const resolvedNotes = (data.reviewNotes || []).filter(n => n.status !== 'OPEN');

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px' }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <div>
                        <img src="/favicon.png" alt="" style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 10 }} />
                        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{data.businessName}</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>
                            Application {data.applicationReference ? <strong style={{ fontFamily: 'monospace' }}>{data.applicationReference}</strong> : 'status'}
                        </p>
                    </div>
                    <button onClick={logout} className="btn btn-ghost"><LogOut size={14} /> Sign out</button>
                </div>

                <div className="card" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${config.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(data.status === 'REJECTED' || data.status === 'UPDATE_REQUIRED')
                            ? <AlertCircle size={22} color={config.color} />
                            : <Clock size={22} color={config.color} />}
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: config.color }}>{config.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                            {data.status === 'REJECTED' ? (data.rejectionReason || 'Contact Payport support for details.') : config.desc}
                        </div>
                    </div>
                </div>

                {openNotes.length > 0 && (
                    <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--red)' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle size={16} color="var(--red)" /> We need something from you
                        </h2>
                        {openNotes.map(n => (
                            <div key={n.id} style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 10, marginBottom: 10 }}>
                                <p style={{ fontSize: 13.5, margin: '0 0 12px' }}>{n.note}</p>
                                <button onClick={() => resolveNote(n.id)} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                                    I've addressed this
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {data.status !== 'REJECTED' && (
                    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} /> Documents
                        </h2>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16 }}>
                            Upload supporting documents for your application.
                        </p>

                        {docs.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                {docs.map(d => (
                                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                        <CheckCircle2 size={14} color="var(--green)" />
                                        <span style={{ fontWeight: 600 }}>{d.documentType.replace(/_/g, ' ')}</span>
                                        <span style={{ color: 'var(--text-faint)' }}>— {d.originalFilename}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <select value={uploadType} onChange={e => setUploadType(e.target.value)} style={{ flex: 1 }}>
                                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
                                <input type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
                            </label>
                        </div>
                    </div>
                )}

                {resolvedNotes.length > 0 && (
                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Previous requests</h2>
                        {resolvedNotes.map(n => (
                            <div key={n.id} style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 8, display: 'flex', gap: 8 }}>
                                <CheckCircle2 size={13} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>{n.note}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
