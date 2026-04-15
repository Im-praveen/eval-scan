import { useState, useRef } from 'react';
import client from '../api/client';

export default function UploadZipModal({ test, onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);
    const inputRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && dropped.name.endsWith('.zip')) {
            setFile(dropped);
            setError('');
        } else {
            setError('Only .zip files are accepted.');
        }
    };

    const handleFileChange = (e) => {
        const chosen = e.target.files[0];
        if (chosen && chosen.name.endsWith('.zip')) {
            setFile(chosen);
            setError('');
        } else {
            setError('Only .zip files are accepted.');
        }
    };

    const handleUpload = async () => {
        if (!file) { setError('Please select a ZIP file.'); return; }

        setUploading(true);
        setError('');
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await client.post(`/batches/upload/${test._id}`, formData, {
                onUploadProgress: (e) => {
                    setProgress(Math.round((e.loaded / e.total) * 100));
                }
            });
            setSuccess(data);
            if (onUploaded) onUploaded(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}>
            <div className="modal" style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <div>
                        <div className="modal-title">📤 Upload ZIP File</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            Test: <span style={{ color: 'var(--accent-light)' }}>{test.name}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose} disabled={uploading}>×</button>
                </div>

                <div className="modal-body">
                    {!success ? (
                        <>
                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => !uploading && inputRef.current.click()}
                                style={{
                                    border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    padding: '36px 24px',
                                    textAlign: 'center',
                                    cursor: uploading ? 'default' : 'pointer',
                                    background: dragging ? 'var(--accent-dim)' : file ? 'var(--success-dim)' : 'var(--bg-input)',
                                    transition: 'all 0.2s ease',
                                    marginBottom: 16
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".zip"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                                <div style={{ fontSize: 36, marginBottom: 10 }}>
                                    {file ? '✅' : dragging ? '📂' : '📦'}
                                </div>
                                {file ? (
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>
                                            {file.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                            {formatSize(file.size)} · Click to change
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
                                            Drop your ZIP file here
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                            or click to browse · Only .zip files
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Upload progress bar */}
                            {uploading && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                                        <span>Uploading...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div style={{
                                        height: 6, borderRadius: 99,
                                        background: 'var(--bg-input)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${progress}%`,
                                            background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                                            transition: 'width 0.3s ease',
                                            borderRadius: 99
                                        }} />
                                    </div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                                        Processing will start automatically after upload
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="login-alert" style={{ marginBottom: 0 }}>
                                    <span>⚠️</span> {error}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Success state */
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Upload Successful!</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                The sheets are being processed in the background.
                            </div>
                            <div style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '10px 14px',
                                textAlign: 'left',
                                fontSize: 12
                            }}>
                                <div style={{ marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Batch ID: </span>
                                    <code style={{ color: 'var(--accent-light)' }}>{success.batchID}</code>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                                    <span className="badge badge-warning">{success.status}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
                        {success ? 'Close' : 'Cancel'}
                    </button>
                    {!success && (
                        <button
                            id="upload-zip-submit"
                            className="btn btn-primary"
                            onClick={handleUpload}
                            disabled={!file || uploading}
                        >
                            {uploading ? <span className="spinner" /> : '📤'}
                            {uploading ? `Uploading ${progress}%` : 'Upload & Process'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
