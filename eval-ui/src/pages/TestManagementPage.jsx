import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import client, { API_BASE } from '../api/client';
import CreateTestModal from '../components/CreateTestModal';
import UploadZipModal from '../components/UploadZipModal';
import AllSheetsModal from '../components/AllSheetsModal';
import PublicLinkModal from '../components/PublicLinkModal';

const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const STATUS_CLASS = {
    scheduled: 'badge-accent',
    active: 'badge-success',
    completed: 'badge-info',
};

export default function TestManagementPage() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [uploadTarget, setUploadTarget] = useState(null);   // test object for upload modal
    const [sheetsTarget, setSheetsTarget] = useState(null);   // test object for all-sheets modal
    const [linkTarget, setLinkTarget] = useState(null);       // test object for public link modal
    const [expandedTest, setExpandedTest] = useState(null);
    const [batches, setBatches] = useState({});
    const [batchLoading, setBatchLoading] = useState({});
    const navigate = useNavigate();

    const fetchTests = async () => {
        setLoading(true);
        try {
            const { data } = await client.get('/tests');
            setTests(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTests(); }, []);

    const handleCreated = (newTest) => setTests(prev => [newTest, ...prev]);

    const handleUploaded = (batchData) => {
        // Refresh batch list for that test
        const testId = batchData.testID;
        setBatches(prev => ({ ...prev, [testId]: undefined }));
        if (expandedTest === testId) loadBatches(testId);
    };

    const [deletingBatch, setDeletingBatch] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const loadBatches = async (testId) => {
        setBatchLoading(prev => ({ ...prev, [testId]: true }));
        try {
            const { data } = await client.get(`/batches/${testId}`);
            setBatches(prev => ({ ...prev, [testId]: data }));
        } finally {
            setBatchLoading(prev => ({ ...prev, [testId]: false }));
        }
    };

    const toggleBatches = async (testId) => {
        if (expandedTest === testId) { setExpandedTest(null); return; }
        setExpandedTest(testId);
        if (!batches[testId]) await loadBatches(testId);
    };

    const viewSheets = (testId, batchId) => {
        navigate(`/tests/${testId}/batches/${batchId}/sheets`);
    };

    const [exporting, setExporting] = useState(null);

    const handleExport = async (testId, testName) => {
        setExporting(testId);
        try {
            // 1. Fetch as standard JSON
            const { data } = await client.get(`/tests/${testId}/export`);

            // 2. Format JSON string
            const jsonString = JSON.stringify(data, null, 2);

            // 3. Use octet-stream to force browser to honor name and extension
            const blob = new Blob([jsonString], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);

            // 4. Construct safe filename
            const fileName = `${(testName || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.json`;

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';

            // 5. Trigger download
            document.body.appendChild(link);
            link.click();

            // 6. 1s timeout to ensure name capture before URL revocation
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (e) {
            console.error('Export error:', e);
            alert('Export failed.');
        } finally {
            setExporting(null);
        }
    };

    const deleteBatch = async (testId, batchId) => {
        setConfirmDelete(null);
        setDeletingBatch(batchId);
        try {
            await client.delete(`/batches/${batchId}`);
            await loadBatches(testId);
        } catch (e) {
            console.error(e);
            alert('Failed to delete batch: ' + (e.response?.data?.error || e.message));
        } finally {
            setDeletingBatch(null);
        }
    };

    return (
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div className="page-header">
                <div>
                    <div className="page-title">Test Management</div>
                    <div className="page-desc">Create tests, upload OMR sheets, and review results</div>
                </div>
                <button id="create-test-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    ➕ Create Test
                </button>
            </div>

            {/* Modals */}
            {showCreate && (
                <CreateTestModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
            )}
            {uploadTarget && (
                <UploadZipModal
                    test={uploadTarget}
                    onClose={() => setUploadTarget(null)}
                    onUploaded={handleUploaded}
                />
            )}
            {sheetsTarget && (
                <AllSheetsModal
                    test={sheetsTarget}
                    onClose={() => setSheetsTarget(null)}
                />
            )}
            {linkTarget && (
                <PublicLinkModal
                    test={linkTarget}
                    onClose={() => setLinkTarget(null)}
                />
            )}

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div className="spinner-page"><span className="spinner spinner-lg spinner-accent" /></div>
                ) : tests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <div className="empty-title">No tests found</div>
                        <div className="empty-desc">Click "Create Test" to get started.</div>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>➕ Create Test</button>
                    </div>
                ) : (
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Test Name</th>
                                    <th>Conduct Date</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tests.map((test, idx) => (
                                    <Fragment key={test._id}>
                                        <tr>
                                            <td className="td-muted">{idx + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{test.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                                    {test._id}
                                                </div>
                                            </td>
                                            <td>📅 {formatDate(test.conductDate)}</td>
                                            <td>
                                                <span className={`badge ${STATUS_CLASS[test.status] || 'badge-muted'}`}>
                                                    {test.status}
                                                </span>
                                            </td>
                                            <td className="td-muted">{formatDate(test.createdAt)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {/* Upload ZIP */}
                                                    <button
                                                        id={`upload-zip-${test._id}`}
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => setUploadTarget(test)}
                                                        title="Upload ZIP of scanned sheets"
                                                    >
                                                        📤 Upload ZIP
                                                    </button>

                                                    {/* View All Sheets */}
                                                    <button
                                                        id={`view-all-sheets-${test._id}`}
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => setSheetsTarget(test)}
                                                        title="View all sheets across batches"
                                                    >
                                                        🗂️ All Sheets
                                                    </button>

                                                    {/* View Batches (expandable) */}
                                                    <button
                                                        id={`view-batches-${test._id}`}
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => toggleBatches(test._id)}
                                                    >
                                                        {expandedTest === test._id ? '▲' : '📦'} Batches
                                                    </button>

                                                    {/* Export JSON Result */}
                                                    <button
                                                        id={`export-test-${test._id}`}
                                                        className="btn btn-outline-success btn-sm"
                                                        onClick={() => handleExport(test._id, test.name)}
                                                        disabled={exporting === test._id}
                                                        title="Export Final Result as JSON"
                                                    >
                                                        {exporting === test._id ? <span className="spinner spinner-sm" /> : '📊 Export JSON'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded batch rows */}
                                        {expandedTest === test._id && (
                                            <tr key={`${test._id}-batches`}>
                                                <td colSpan={6} style={{ padding: 0, background: 'var(--bg-base)' }}>
                                                    <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)' }}>
                                                        <div style={{
                                                            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                                            marginBottom: 10, letterSpacing: '0.5px', textTransform: 'uppercase'
                                                        }}>
                                                            Batches — {test.name}
                                                        </div>

                                                        {batchLoading[test._id] ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                                                                <span className="spinner" style={{ borderTopColor: 'var(--accent)', width: 16, height: 16 }} />
                                                                Loading batches...
                                                            </div>
                                                        ) : !batches[test._id] || batches[test._id].length === 0 ? (
                                                            <div style={{
                                                                color: 'var(--text-muted)', fontSize: 13, padding: '8px 0',
                                                                display: 'flex', alignItems: 'center', gap: 10
                                                            }}>
                                                                No batches yet.
                                                                <button className="btn btn-primary btn-sm"
                                                                    onClick={() => setUploadTarget(test)}>
                                                                    📤 Upload ZIP
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {batches[test._id].map((batch, bi) => (
                                                                    <div key={batch._id} style={{
                                                                        display: 'flex', alignItems: 'center', gap: 14,
                                                                        background: 'var(--bg-card)',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        padding: '10px 16px'
                                                                    }}>
                                                                        <div style={{ fontWeight: 600, fontSize: 13, minWidth: 70 }}>
                                                                            Batch {bi + 1}
                                                                        </div>
                                                                        <div style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                                            {batch._id}
                                                                        </div>
                                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                                            {formatDate(batch.createdAt)}
                                                                        </div>
                                                                        <span className={`badge ${batch.status === 'completed' ? 'badge-success'
                                                                            : batch.status === 'failed' ? 'badge-danger'
                                                                                : batch.status === 'processing' ? 'badge-warning'
                                                                                    : 'badge-muted'
                                                                            }`}>{batch.status}</span>
                                                                        {batch.status === 'completed' && (
                                                                            <button
                                                                                id={`view-records-${batch._id}`}
                                                                                className="btn btn-primary btn-sm"
                                                                                onClick={() => viewSheets(test._id, batch._id)}
                                                                            >
                                                                                👁 View Records
                                                                            </button>
                                                                        )}
                                                                        {confirmDelete === batch._id ? (
                                                                            <button
                                                                                id={`confirm-delete-${batch._id}`}
                                                                                className="btn btn-danger btn-sm"
                                                                                style={{ animation: 'fadeIn 0.2s ease', background: 'var(--danger)', color: '#fff' }}
                                                                                onClick={() => deleteBatch(test._id, batch._id)}
                                                                                disabled={deletingBatch === batch._id}
                                                                            >
                                                                                {deletingBatch === batch._id ? <span className="spinner spinner-sm" style={{ width: 14, height: 14 }} /> : ''} Click to Erase
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                id={`delete-batch-${batch._id}`}
                                                                                className="btn btn-danger btn-sm"
                                                                                onClick={() => setConfirmDelete(batch._id)}
                                                                                disabled={deletingBatch === batch._id}
                                                                            >
                                                                                {deletingBatch === batch._id ? <span className="spinner spinner-sm" style={{ width: 14, height: 14, borderTopColor: 'var(--danger)' }} /> : '🗑️'} Delete
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
