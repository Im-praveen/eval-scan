import { useState, useEffect } from 'react';
import client, { API_BASE } from '../api/client';

export default function PublicLinkModal({ test, onClose }) {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchKey = async () => {
            try {
                const { data } = await client.get('/auth/api-key');
                setApiKey(data.apiKey);
            } catch (e) {
                console.error('Failed to fetch API key');
            } finally {
                setLoading(false);
            }
        };
        fetchKey();
    }, []);

    const publicUrl = `${API_BASE}/batches/upload/${test._id}?apiKey=${apiKey}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 550 }}>
                <div className="modal-header">
                    <div className="modal-title">🔗 Integration URL — {test.name}</div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Use this unique URL in your integrated application or scanning software to push ZIP batches 
                            directly to this test. No session login is required.
                        </p>
                    </div>

                    <div style={{ 
                        background: 'var(--bg-input)', 
                        padding: '14px', 
                        borderRadius: 10, 
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 16
                    }}>
                        <div style={{ 
                            flex: 1, 
                            fontFamily: 'monospace', 
                            fontSize: 12, 
                            color: 'var(--accent-light)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {loading ? 'Fetching integration info...' : publicUrl}
                        </div>
                        <button 
                            className={`btn ${copied ? 'btn-success' : 'btn-secondary'} btn-sm`}
                            onClick={handleCopy}
                            disabled={loading}
                        >
                            {copied ? '✓ Copied' : '📋 Copy'}
                        </button>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        gap: 10, 
                        background: 'rgba(245, 158, 11, 0.1)', 
                        padding: '12px', 
                        borderRadius: 8,
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                        <span style={{ fontSize: 16 }}>⚠️</span>
                        <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 500 }}>
                            Security Warning: This URL contains your system API key. 
                            Anyone with this link can upload data to this specific test. 
                            Treat it like a password.
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={handleCopy} disabled={loading}>
                        {copied ? '✓ Link Copied' : '🔗 Copy Integration Link'}
                    </button>
                </div>
            </div>
        </div>
    );
}
