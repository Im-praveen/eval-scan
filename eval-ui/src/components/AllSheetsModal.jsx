import { useState, useEffect, useRef } from 'react';
import client, { API_ROOT } from '../api/client';

function ResultsPanel({ sheet, test, activeField, onFieldClick, onUpdate, duplicateRolls = [] }) {
    const [editMode, setEditMode] = useState(false);
    const [editVal, setEditVal] = useState('');
    const [saving, setSaving] = useState(false);
    const [localSheet, setLocalSheet] = useState(sheet);
    const [inlineEditField, setInlineEditField] = useState(null);
    const [inlineEditValue, setInlineEditValue] = useState('');

    useEffect(() => {
        setLocalSheet(sheet);
        setEditMode(false);
    }, [sheet]);

    const activeResult = localSheet.is_updated
        ? { ...localSheet.result, ...(typeof localSheet.updated_result === 'object' ? localSheet.updated_result : {}) }
        : localSheet.result;
    const validationErrors = [];
    if (activeResult && typeof activeResult === "object" && test?.templateMap) {
        Object.keys(activeResult).forEach(blockId => {
            const val = activeResult[blockId];
            const strVal = (typeof val === 'object' && val !== null && val.value !== undefined) ? String(val.value) : String(val || '');
            const templateDef = test.templateMap[blockId];

            if (strVal.includes('*')) {
                validationErrors.push({ blockId, type: 'symbol' });
            } else if (templateDef) {
                if (templateDef.allowedValues && Array.isArray(templateDef.allowedValues)) {
                    if (!templateDef.allowedValues.includes(strVal)) {
                        validationErrors.push({ blockId, type: 'invalid' });
                    }
                } else if (templateDef.length !== undefined && strVal.length !== templateDef.length) {
                    validationErrors.push({ blockId, type: 'length' });
                } else if (!val || strVal === 'undefined' || strVal === '') {
                    validationErrors.push({ blockId, type: 'missing' });
                }
            }
        });

        // Duplicate Check
        const rollVal = (typeof activeResult.RollNo === 'object' && activeResult.RollNo !== null) ? activeResult.RollNo.value : activeResult.RollNo;
        if (rollVal && duplicateRolls.includes(String(rollVal))) {
            validationErrors.push({ blockId: 'RollNo', type: 'duplicate' });
        }
    }

    let resultEntries = [];
    if (activeResult && typeof activeResult === 'object') {
        const keys = test && test.blockOrder && test.blockOrder.length > 0
            ? test.blockOrder.filter(k => activeResult[k] !== undefined)
            : (test && test.templateOrder ? test.templateOrder.filter(k => activeResult[k] !== undefined) : Object.keys(activeResult));
        resultEntries = keys.map(k => [k, activeResult[k]]);
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
            onUpdate?.(data);
            setEditMode(false);
        } catch (e) {
            alert('Save failed: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    const handleInlineSave = async (field, newVal) => {
        const currentDisplayVal = (localSheet.updated_result && localSheet.updated_result[field] !== undefined)
            ? String(localSheet.updated_result[field])
            : String((typeof sheet.result[field] === 'object' && sheet.result[field] !== null) ? sheet.result[field].value : sheet.result[field]);

        if (newVal === currentDisplayVal) {
            setInlineEditField(null);
            return;
        }

        setSaving(true);
        try {
            const currentUpdated = typeof localSheet.updated_result === 'object' ? { ...localSheet.updated_result } : {};
            currentUpdated[field] = newVal;

            const { data } = await client.patch(`/sheets/${localSheet._id}`, {
                updated_result: currentUpdated
            });
            setLocalSheet(data);
            onUpdate?.(data);
        } catch (e) {
            alert('Save failed: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
            setInlineEditField(null);
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
            </div>

            {/* Backend Error Message (Priority) */}
            {localSheet.errorMessage && (
                <div style={{
                    margin: '0 18px 12px',
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#ef4444',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                }}>
                    <span style={{ fontSize: 14 }}>🚫</span>
                    <span>{localSheet.errorMessage}</span>
                </div>
            )}

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
                                <div
                                    key={k}
                                    onClick={() => onFieldClick?.(k)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '7px 12px',
                                        borderRadius: 6,
                                        background: activeField === k ? 'var(--accent-dim)' : 'var(--bg-input)',
                                        border: `1px solid ${activeField === k ? 'var(--accent)' : 'transparent'}`,
                                        borderLeft: validationErrors.some(e => e.blockId === k) ? '3px solid #ef4444' : `1px solid ${activeField === k ? 'var(--accent)' : 'transparent'}`,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        transition: 'all 0.1s'
                                    }}
                                >
                                    <span style={{
                                        color: validationErrors.some(e => e.blockId === k) ? '#ef4444' : (activeField === k ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                        fontWeight: activeField === k ? 700 : 500
                                    }}>
                                        {k}
                                        {validationErrors.some(e => e.blockId === k) && <span style={{ marginLeft: 6 }}>⚠️</span>}
                                    </span>
                                    {inlineEditField === k ? (
                                        <input
                                            autoFocus
                                            className="form-input"
                                            style={{
                                                width: '100px',
                                                fontSize: 12,
                                                padding: '2px 8px',
                                                height: '24px',
                                                textAlign: 'right',
                                                fontWeight: 700
                                            }}
                                            value={inlineEditValue}
                                            onChange={e => setInlineEditValue(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                            onBlur={() => handleInlineSave(k, inlineEditValue)}
                                            onKeyDown={e => e.key === 'Enter' && handleInlineSave(k, inlineEditValue)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setInlineEditField(k);
                                                const currentVal = (localSheet.updated_result && localSheet.updated_result[k] !== undefined)
                                                    ? localSheet.updated_result[k]
                                                    : ((typeof v === 'object' && v !== null && v.value !== undefined) ? String(v.value) : String(v));
                                                setInlineEditValue(currentVal);
                                            }}
                                            style={{
                                                fontWeight: 700,
                                                color: 'var(--text-primary)',
                                                background: activeField === k ? 'var(--accent)' : 'var(--accent-dim)',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                fontSize: 12,
                                                transition: 'all 0.1s'
                                            }}
                                        >
                                            {(localSheet.updated_result && localSheet.updated_result[k] !== undefined)
                                                ? localSheet.updated_result[k]
                                                : ((typeof v === 'object' && v !== null && v.value !== undefined) ? String(v.value) : String(v))}
                                        </span>
                                    )}
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
                    </div>

                    {localSheet.is_updated && localSheet.updated_result ? (
                        <div style={{
                            background: 'var(--success-dim)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 12.5,
                            color: 'var(--success)'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Override Saved</div>
                            <pre style={{
                                margin: 0, fontFamily: 'monospace', color: 'var(--text-secondary)',
                                whiteSpace: 'pre-wrap', fontSize: 11.5
                            }}>
                                {JSON.stringify(localSheet.updated_result, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No review override recorded.
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

    // Highlighting state
    const [highlightedField, setHighlightedField] = useState(null);
    const [imgMetrics, setImgMetrics] = useState(null); // { naturalWidth, naturalHeight, clientWidth, clientHeight }
    const imgRef = useRef(null);

    const fetchLockRef = useRef(null);

    useEffect(() => {
        const fetchKey = test._id;
        if (fetchLockRef.current === fetchKey) return;
        fetchLockRef.current = fetchKey;

        let ignore = false;

        const fetch = async () => {
            setLoading(true);
            try {
                const [sheetsRes, templateRes] = await Promise.all([
                    client.get(`/sheets/by-test/${test._id}`),
                    client.get(`/template/structure?testId=${test._id}`)
                ]);

                if (ignore) return;

                const tMap = {};
                const tOrder = [];
                if (Array.isArray(templateRes.data)) {
                    templateRes.data.forEach(item => {
                        tMap[item.blockId] = item;
                        tOrder.push(item.blockId);
                    });
                }

                setSheets(sheetsRes.data);
                test.templateMap = tMap; // Inject templateMap into test object for cross-component access
                test.templateOrder = tOrder; // Inject templateOrder as well

                if (sheetsRes.data.length > 0) setSelected(sheetsRes.data[0]);
            } catch (e) {
                if (!ignore) {
                    setError('Failed to load sheets or template.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };
        fetch();

        return () => {
            ignore = true;
            fetchLockRef.current = null;
        };
    }, [test._id]);

    useEffect(() => {
        setImgError(false);
        setConfirmDelete(false);
        setHighlightedField(null);
        setImgMetrics(null);
    }, [selected]);

    const handleImageLoad = (e) => {
        const img = e.target;
        setImgMetrics({
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            clientWidth: img.clientWidth,
            clientHeight: img.clientHeight
        });
    };

    const refreshMetrics = () => {
        if (imgRef.current) {
            setImgMetrics({
                naturalWidth: imgRef.current.naturalWidth,
                naturalHeight: imgRef.current.naturalHeight,
                clientWidth: imgRef.current.clientWidth,
                clientHeight: imgRef.current.clientHeight
            });
        }
    };

    const handleSheetUpdate = (updatedSheet) => {
        setSheets(prev => prev.map(s => s._id === updatedSheet._id ? updatedSheet : s));
        if (selected?._id === updatedSheet._id) {
            setSelected(updatedSheet);
        }
    };

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

    // --- Duplicate Detection ---
    const rollCounts = {};
    sheets.forEach(s => {
        const res = s.is_updated
            ? { ...s.result, ...(typeof s.updated_result === 'object' ? s.updated_result : {}) }
            : s.result;
        const rollVal = (typeof res?.RollNo === 'object' && res.RollNo !== null) ? res.RollNo.value : res?.RollNo;
        if (rollVal && String(rollVal).trim() !== '' && rollVal !== '*') {
            rollCounts[rollVal] = (rollCounts[rollVal] || 0) + 1;
        }
    });
    const duplicateRolls = Object.keys(rollCounts).filter(r => rollCounts[r] > 1);

    const groupedObj = {};
    sheets.forEach(s => {
        const bid = (typeof s.batchID === 'object' && s.batchID !== null)
            ? (s.batchID._id || s.batchID).toString()
            : (s.batchID || 'unbatched').toString();

        if (!groupedObj[bid]) groupedObj[bid] = { batch: typeof s.batchID === 'object' ? s.batchID : null, sheets: [] };
        groupedObj[bid].sheets.push(s);
    });

    const batchGroups = Object.values(groupedObj).sort((a, b) => {
        const tA = new Date(a.batch?.createdAt || 0).getTime();
        const tB = new Date(b.batch?.createdAt || 0).getTime();
        return tB - tA;
    });

    const token = localStorage.getItem('eval_token') || '';
    const imgSrc = selected ? `${API_ROOT}/api/sheets/image/${selected._id}?token=${token}` : '';

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
                            width: 550,
                            borderRight: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-sidebar)',
                            flexShrink: 0
                        }}>
                            <div style={{ padding: '0 10px 10px' }}>
                                <input
                                    className="form-input"
                                    style={{ fontSize: 13, padding: '10px 14px' }}
                                    placeholder="🔍 Search sheets by name..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Column Headers */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 70px 1.5fr',
                                padding: '5px 8px',
                                fontSize: 11,
                                fontWeight: 800,
                                background: 'rgba(0,0,0,0.02)',
                                borderBottom: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                gap: '5px',
                            }}>
                                <div>Sheet Name</div>
                                <div style={{ textAlign: 'center' }}>Status</div>
                                <div>Remarks</div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
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
                                            padding: '5px 8px 5px',
                                            background: 'var(--bg-input)',
                                            borderTop: '1px solid var(--border)',
                                            borderBottom: '1px solid var(--border)',
                                            marginBottom: 0
                                        }}>
                                            Batch {batchGroups.length - gIdx}
                                            <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 6, fontWeight: 400 }}>
                                                {grp.batch?._id ? `...${grp.batch._id.slice(-6)}` : ''}
                                            </span>
                                        </div>
                                        {[...grp.sheets].sort((a, b) => a.sheetName.localeCompare(b.sheetName)).map(s => {
                                            const res = s.is_updated
                                                ? { ...s.result, ...(typeof s.updated_result === 'object' ? s.updated_result : {}) }
                                                : s.result;

                                            const errorFields = [];
                                            if (res && test.templateMap) {
                                                Object.entries(test.templateMap).forEach(([bid, def]) => {
                                                    const val = res[bid];
                                                    const sVal = (typeof val === 'object' && val !== null && val.value !== undefined) ? String(val.value) : String(val || '');
                                                    let isErr = false;
                                                    if (sVal.includes('*')) isErr = true;
                                                    else if (def.allowedValues && Array.isArray(def.allowedValues)) {
                                                        if (!def.allowedValues.includes(sVal)) isErr = true;
                                                    }
                                                    else if (def.length !== undefined && sVal.length !== def.length) isErr = true;
                                                    else if (!val || sVal === '' || sVal === 'undefined') isErr = true;
                                                    if (isErr) errorFields.push(bid);
                                                });

                                                const rollVal = (typeof res.RollNo === 'object' && res.RollNo !== null) ? res.RollNo.value : res.RollNo;
                                                if (rollVal && duplicateRolls.includes(String(rollVal))) {
                                                    if (!errorFields.includes('RollNo')) errorFields.push('RollNo (Duplicate)');
                                                    else errorFields[errorFields.indexOf('RollNo')] = 'RollNo (Duplicate)';
                                                }
                                            }

                                            Object.entries(res || {}).forEach(([bid, val]) => {
                                                if (test.templateMap?.[bid]) return;
                                                const sVal = (typeof val === 'object' && val !== null && val.value !== undefined) ? String(val.value) : String(val || '');
                                                if (sVal.includes('*') && !errorFields.includes(bid)) errorFields.push(bid);
                                            });

                                            const hasErrors = errorFields.length > 0;

                                            return (
                                                <div
                                                    key={s._id}
                                                    onClick={() => setSelected(s)}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1.2fr 70px 1.5fr',
                                                        padding: '5px 8px',
                                                        cursor: 'pointer',
                                                        background: selected?._id === s._id ? 'var(--accent-dim)' : 'transparent',
                                                        borderBottom: '1px solid var(--border)',
                                                        transition: 'all 0.1s',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                    }}
                                                >
                                                    {/* 1: Sheet Name */}
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{
                                                            fontSize: 13, fontWeight: 600,
                                                            color: selected?._id === s._id ? 'var(--accent-light)' : 'var(--text-primary)',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                        }}>
                                                            {s.sheetName}
                                                        </div>
                                                        {s.is_updated && <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>✓ Reviewed</div>}
                                                    </div>

                                                    {/* 2: Status */}
                                                    <div style={{ textAlign: 'center' }}>
                                                        {hasErrors ? (
                                                            <span title="Errors present" style={{ fontSize: 18 }}>⚠️</span>
                                                        ) : (
                                                            <span title="Correct" style={{ fontSize: 18 }}>✅</span>
                                                        )}
                                                    </div>

                                                    {/* 3: Remarks */}
                                                    <div style={{
                                                        fontSize: 11.5,
                                                        color: hasErrors ? '#ef4444' : 'var(--text-muted)',
                                                        fontWeight: hasErrors ? 600 : 400,
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {hasErrors ? errorFields.join(', ') : 'No errors detected'}
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                                ? (
                                    <ResultsPanel
                                        key={selected._id}
                                        sheet={selected}
                                        test={test}
                                        activeField={highlightedField}
                                        onFieldClick={(k) => {
                                            refreshMetrics();
                                            setHighlightedField(k === highlightedField ? null : k);
                                        }}
                                        onUpdate={handleSheetUpdate}
                                    />
                                )
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
                                            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
                                                <img
                                                    key={selected._id}
                                                    ref={imgRef}
                                                    src={imgSrc}
                                                    alt={selected.sheetName}
                                                    onLoad={handleImageLoad}
                                                    onError={() => setImgError(true)}
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        display: 'block',
                                                        objectFit: 'contain',
                                                        borderRadius: 8,
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                        cursor: 'zoom-in'
                                                    }}
                                                    onClick={() => setLightbox(true)}
                                                />
                                                {/* Highlight Box */}
                                                {selected && highlightedField && selected.result?.[highlightedField]?.bounds && imgMetrics && (
                                                    (() => {
                                                        const b = selected.result[highlightedField].bounds;
                                                        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgMetrics;

                                                        // Scaling factors
                                                        const sx = clientWidth / naturalWidth;
                                                        const sy = clientHeight / naturalHeight;

                                                        return (
                                                            <div
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: b.x * sx,
                                                                    top: b.y * sy,
                                                                    width: b.width * sx,
                                                                    height: b.height * sy,
                                                                    border: '3px solid #10b981',
                                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)',
                                                                    borderRadius: '2px',
                                                                    pointerEvents: 'none',
                                                                    zIndex: 10,
                                                                    animation: 'pulseHighlight 1.5s infinite ease-in-out'
                                                                }}
                                                            />
                                                        );
                                                    })()
                                                )}
                                            </div>
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
