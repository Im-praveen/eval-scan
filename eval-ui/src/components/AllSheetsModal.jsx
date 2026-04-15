import { useState, useEffect } from 'react';
import client from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

function ResultsPanel({ sheet, test }) {
    const [editMode, setEditMode] = useState(false);
    const [editVal, setEditVal] = useState('');
    const [saving, setSaving] = useState(false);
    const [localSheet, setLocalSheet] = useState(sheet);

    useEffect(() => {
        setLocalSheet(sheet);
        setEditMode(false);
    }, [sheet]);

    let resultEntries = [];
    if (localSheet.result && typeof localSheet.result === 'object') {
        if (test && test.blockOrder && test.blockOrder.length > 0) {
            resultEntries = test.blockOrder
                .filter(k => localSheet.result[k] !== undefined)
                .map(k => [k, localSheet.result[k]]);
        } else {
            resultEntries = Object.entries(localSheet.result);
        }
    }

    const startEdit = () => {
        const cur = localSheet.updated_result;
        setEditVal(typeof cur === 'object' ? JSON.stringify(cur, null, 2) : (cur || ''));
        setEditMode(true);
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            let parsed;
            try { parsed = JSON.parse(editVal); } catch { parsed = editVal; }
            const { data } = await client.patch(`/sheets/${localSheet._id}`, { updated_result: parsed });
            setLocalSheet(data);
            setEditMode(false);
        } catch (e) {
            alert('Save failed: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Sheet header */}
            <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {localSheet.sheetName}
                    </div>
                    {localSheet.is_updated && <span className="badge badge-success">✓ Reviewed</span>}
                </div>
                {localSheet.last_modified && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        Modified: {new Date(localSheet.last_modified).toLocaleString('en-IN')}
                    </div>
                )}
            </div>

            {/* Results scroll area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                {/* Extracted result */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',
                        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8
                    }}>
                        Extracted Results
                    </div>
                    {resultEntries.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {resultEntries.map(([k, v]) => (
                                <div key={k} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '7px 12px',
                                    borderRadius: 6,
                                    background: 'var(--bg-input)',
                                    fontSize: 13
                                }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{k}</span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        background: 'var(--accent-dim)',
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        fontSize: 12
                                    }}>{(typeof v === 'object' && v !== null && v.value !== undefined) ? String(v.value) : String(v)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No extracted result available
                        </div>
                    )}
                </div>

                {/* Updated result section */}
                <div>
                    <div style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',
                        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <span>Review / Override</span>
                        {!editMode && (
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 10px', fontSize: 11.5 }}
                                onClick={startEdit}
                            >
                                ✏️ {localSheet.is_updated ? 'Edit' : 'Add'}
                            </button>
                        )}
                    </div>

                    {editMode ? (
                        <div>
                            <textarea
                                className="form-input form-textarea"
                                rows={5}
                                value={editVal}
                                onChange={e => setEditVal(e.target.value)}
                                style={{ fontSize: 12, resize: 'vertical', marginBottom: 8 }}
                                placeholder='e.g. {"Q1":"A","Q2":"B"} or plain text'
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={() => setEditMode(false)} disabled={saving}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={saveEdit} disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 13, height: 13 }} /> : '💾'}
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ) : localSheet.is_updated ? (
                        <div style={{
                            background: 'var(--success-dim)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 12.5,
                            color: 'var(--success)'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Override Saved</div>
                            <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                {typeof localSheet.updated_result === 'object'
                                    ? JSON.stringify(localSheet.updated_result, null, 2)
                                    : String(localSheet.updated_result)}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No review override yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AllSheetsModal({ test, onClose }) {
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [imgError, setImgError] = useState(false);
    const [lightbox, setLightbox] = useState(false);
    const [deletingSheet, setDeletingSheet] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await client.get(`/sheets/by-test/${test._id}`);
                setSheets(data);
                if (data.length > 0) setSelected(data[0]);
            } catch (e) {
                setError('Failed to load sheets.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [test._id]);

    useEffect(() => {
        setImgError(false);
        setConfirmDelete(false);
    }, [selected]);

    const handleDeleteSheet = async () => {
        if (!selected) return;
        setDeletingSheet(selected._id);
        setConfirmDelete(false);
        try {
            await client.delete(`/sheets/${selected._id}`);
            const newSheets = sheets.filter(s => s._id !== selected._id);
            setSheets(newSheets);
            if (newSheets.length > 0) {
                setSelected(newSheets[0]);
            } else {
                setSelected(null);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to delete sheet: ' + (e.response?.data?.error || e.message));
        } finally {
            setDeletingSheet(null);
        }
    };

    const filtered = sheets.filter(s =>
        s.sheetName.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.sheetName.localeCompare(b.sheetName));

    const groupedObj = {};
    filtered.forEach(s => {
        const bid = s.batchID?._id || s.batchID || 'unknown-batch';
        if (!groupedObj[bid]) groupedObj[bid] = { batch: s.batchID, sheets: [] };
        groupedObj[bid].sheets.push(s);
    });

    const batchGroups = Object.values(groupedObj).sort((a, b) => {
        const tA = new Date(a.batch?.createdAt || 0).getTime();
        const tB = new Date(b.batch?.createdAt || 0).getTime();
        return tA - tB;
    });

    const token = localStorage.getItem('eval_token') || '';
    const imgSrc = selected ? `${API_BASE}/api/sheets/image/${selected._id}?token=${token}` : '';

    return (
        <>
            {/* Lightbox */}
            {lightbox && selected && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
                        backdropFilter: 'blur(10px)', zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeIn 0.15s ease'
                    }}
                    onClick={() => setLightbox(false)}
                >
                    <button onClick={() => setLightbox(false)} style={{
                        position: 'fixed', top: 20, right: 24,
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                        fontSize: 24, width: 44, height: 44, borderRadius: '50%',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>×</button>
                    <img src={imgSrc} alt={selected.sheetName} style={{
                        maxWidth: '90vw', maxHeight: '90vh',
                        objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
                    }} />
                </div>
            )}

            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    width: '95vw',
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideUp 0.2s ease'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--bg-surface)',
                        flexShrink: 0
                    }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>🗂️ All Sheets — {test.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                {loading ? 'Loading...' : `${sheets.length} sheet${sheets.length !== 1 ? 's' : ''} across all batches`}
                                {sheets.length > 0 && ` · ${sheets.filter(s => s.is_updated).length} reviewed`}
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose} style={{ fontSize: 24 }}>×</button>
                    </div>

                    {/* Body — 3 columns */}
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* LEFT: Sheet list */}
                        <div style={{
                            width: 240,
                            borderRight: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-sidebar)',
                            flexShrink: 0
                        }}>
                            {/* Search */}
                            <div style={{ padding: '10px 10px 6px' }}>
                                <input
                                    className="form-input"
                                    style={{ fontSize: 12.5, padding: '7px 10px' }}
                                    placeholder="🔍 Search..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px 10px' }}>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                                        <span className="spinner spinner-accent" />
                                    </div>
                                ) : error ? (
                                    <div style={{ fontSize: 12, color: 'var(--danger)', padding: '12px 8px' }}>{error}</div>
                                ) : filtered.length === 0 ? (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 8px', textAlign: 'center' }}>
                                        {search ? 'No match' : 'No sheets'}
                                    </div>
                                ) : batchGroups.map((grp, gIdx) => (
                                    <div key={grp.batch?._id || `group-${gIdx}`} style={{ marginBottom: 12 }}>
                                        <div style={{
                                            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            padding: '8px 10px 4px', borderBottom: '1px solid var(--border)',
                                            marginBottom: 6
                                        }}>
                                            Batch {gIdx + 1}
                                            <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 6, fontWeight: 400 }}>
                                                {grp.batch?._id ? `...${grp.batch._id.slice(-6)}` : ''}
                                            </span>
                                        </div>
                                        {grp.sheets.map(s => (
                                            <div
                                                key={s._id}
                                                onClick={() => setSelected(s)}
                                                style={{
                                                    padding: '9px 10px',
                                                    borderRadius: 7,
                                                    cursor: 'pointer',
                                                    marginBottom: 2,
                                                    background: selected?._id === s._id ? 'var(--accent-dim)' : 'transparent',
                                                    border: `1px solid ${selected?._id === s._id ? 'var(--border-active)' : 'transparent'}`,
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: 12.5, fontWeight: 600,
                                                    color: selected?._id === s._id ? 'var(--accent-light)' : 'var(--text-primary)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>
                                                    {s.sheetName}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6 }}>
                                                    {s.is_updated && <span style={{ color: 'var(--success)' }}>✓ Overridden</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CENTER: Results panel */}
                        <div style={{
                            width: 320,
                            borderRight: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}>
                            {selected
                                ? <ResultsPanel key={selected._id} sheet={selected} test={test} />
                                : (
                                    <div className="empty-state">
                                        <div className="empty-icon">👈</div>
                                        <div className="empty-title">Select a Sheet</div>
                                        <div className="empty-desc">Click a sheet from the list to view results</div>
                                    </div>
                                )}
                        </div>

                        {/* RIGHT: Image panel */}
                        <div style={{
                            flex: 1,
                            background: 'var(--bg-base)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {selected ? (
                                <>
                                    {/* Image toolbar */}
                                    <div style={{
                                        padding: '10px 16px',
                                        borderBottom: '1px solid var(--border)',
                                        background: 'var(--bg-surface)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        flexShrink: 0
                                    }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            Sheet Image
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {confirmDelete ? (
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    style={{ animation: 'fadeIn 0.2s ease', background: 'var(--danger)', color: '#fff' }}
                                                    onClick={handleDeleteSheet}
                                                    disabled={deletingSheet === selected._id}
                                                >
                                                    {deletingSheet === selected._id ? <span className="spinner spinner-sm" style={{ width: 14, height: 14 }} /> : ''} Click to Erase
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                                    onClick={() => setConfirmDelete(true)}
                                                    disabled={deletingSheet === selected._id}
                                                >
                                                    {deletingSheet === selected._id ? <span className="spinner spinner-sm" style={{ width: 14, height: 14, borderTopColor: 'var(--danger)' }} /> : '🗑️'} Delete Sheet
                                                </button>
                                            )}
                                            {!imgError && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => setLightbox(true)}
                                                >
                                                    🔍 Full Screen
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Image */}
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 20,
                                        overflow: 'auto'
                                    }}>
                                        {imgError ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">🖼️</div>
                                                <div className="empty-title">Image Not Available</div>
                                                <div className="empty-desc">The image file could not be loaded from disk.</div>
                                            </div>
                                        ) : (
                                            <img
                                                key={selected._id}
                                                src={imgSrc}
                                                alt={selected.sheetName}
                                                onError={() => setImgError(true)}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100%',
                                                    objectFit: 'contain',
                                                    borderRadius: 8,
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                    cursor: 'zoom-in'
                                                }}
                                                onClick={() => setLightbox(true)}
                                            />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state" style={{ height: '100%' }}>
                                    <div className="empty-icon">🖼️</div>
                                    <div className="empty-title">No Sheet Selected</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
