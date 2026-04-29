import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client, { API_ROOT } from '../api/client';

function Lightbox({ src, name, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="lightbox-close" onClick={onClose}>×</button>
      <img src={src} alt={name} className="lightbox-img" />
    </div>
  );
}

function SheetCard({ sheet, test, duplicateRolls = [] }) {
  const [lightbox, setLightbox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localSheet, setLocalSheet] = useState(sheet);

  const token = localStorage.getItem('eval_token') || '';
  const imgSrc = `${API_ROOT}/api/sheets/image/${sheet._id}?token=${token}`;

  const activeResult = localSheet.is_updated
    ? { ...localSheet.result, ...(typeof localSheet.updated_result === 'object' ? localSheet.updated_result : {}) }
    : localSheet.result;

  const startEdit = () => {
    const cur = localSheet.updated_result;
    setEditVal(typeof cur === 'object' ? JSON.stringify(cur, null, 2) : (cur || ''));
    setEditing(true);
    setSaved(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      let parsed;
      try { parsed = JSON.parse(editVal); } catch { parsed = editVal; }
      const { data } = await client.patch(`/sheets/${sheet._id}`, { updated_result: parsed });
      setLocalSheet(data);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  // Calculate entries to show
  let resultEntries = [];
  if (activeResult && typeof activeResult === 'object') {
    const keys = test && test.blockOrder && test.blockOrder.length > 0
      ? test.blockOrder.filter(k => activeResult[k] !== undefined)
      : (test && test.templateOrder ? test.templateOrder.filter(k => activeResult[k] !== undefined) : Object.keys(activeResult));

    resultEntries = keys.map(k => [k, activeResult[k]]);
  }

  // --- Validation Logic ---
  const validationErrors = [];
  let hasSeriousError = false;

  if (activeResult && typeof activeResult === "object") {
    // Check every key in the result data
    Object.keys(activeResult).forEach(blockId => {
      const val = activeResult[blockId];
      const strVal = (typeof val === 'object' && val !== null && val.value !== undefined) ? String(val.value) : String(val || '');
      const templateDef = test?.templateMap?.[blockId];

      // 1. Check for * (Mandatory for all fields)
      if (strVal.includes('*')) {
        validationErrors.push({ blockId, error: 'Contains * (multiple marks)' });
        hasSeriousError = true;
      }
      // 1.5 Check for spaces (invalid in bubbles)
      else if (strVal.includes(' ')) {
        validationErrors.push({ blockId, error: 'Contains space (invalid bubble value)' });
        hasSeriousError = true;
      }
      // 2. Check for missing value
      else if (!val || strVal === 'undefined' || strVal === '') {
        validationErrors.push({ blockId, error: 'Missing value' });
        hasSeriousError = true;
      }
      // 3. Template-based validation
      else if (templateDef) {
        if (templateDef.allowedValues && Array.isArray(templateDef.allowedValues)) {
          if (!templateDef.allowedValues.includes(strVal)) {
            validationErrors.push({ blockId, error: `Invalid value (Selection required: ${templateDef.allowedValues.join(', ')})` });
            hasSeriousError = true;
          }
        } else if (templateDef.length !== undefined && strVal.length !== templateDef.length) {
          validationErrors.push({ blockId, error: `Length mismatch (Expected ${templateDef.length}, got ${strVal.length})` });
          hasSeriousError = true;
        }
      }
    });

    // 4. Duplicate Check
    const rollVal = (typeof activeResult.RollNo === 'object' && activeResult.RollNo !== null) ? activeResult.RollNo.value : activeResult.RollNo;
    if (rollVal && (duplicateRolls || []).includes(String(rollVal))) {
      validationErrors.push({ blockId: 'RollNo', error: 'Duplicate Roll Number detected in batch' });
      hasSeriousError = true;
    }
  }

  const getFieldError = (blockId) => validationErrors.find(e => e.blockId === blockId);
  const errorFields = validationErrors.map(e => e.blockId);

  return (
    <div className={`sheet-card ${hasSeriousError ? 'has-error' : ''}`}>
      {hasSeriousError && (
        <div className="error-summary-box" style={{
          fontSize: 10,
          padding: '4px 8px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          fontWeight: 600
        }}>
          ⚠️ Needs attention: {errorFields.join(', ')}
        </div>
      )}
      {lightbox && <Lightbox src={imgSrc} name={localSheet.sheetName} onClose={() => setLightbox(false)} />}

      <div className="sheet-image-wrap" onClick={() => setLightbox(true)}>
        <img src={imgSrc} alt={localSheet.sheetName} loading="lazy"
          onError={(e) => { e.target.src = ''; e.target.parentElement.style.background = 'var(--bg-input)'; }} />
        <div className="sheet-img-overlay">
          <span className="sheet-img-overlay-icon">🔍</span>
        </div>

        {/* Status Badge Over Image */}
        <div className={`sheet-status-badge ${hasSeriousError ? 'status-red' : 'status-green'}`}>
          {hasSeriousError ? (
            <>⚠️ Action Required: {validationErrors.map(e => e.blockId).join(', ')}</>
          ) : '✅ Correct'}
        </div>
      </div>

      <div className="sheet-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
          <div className="sheet-name" title={localSheet.sheetName}>{localSheet.sheetName}</div>
          {localSheet.is_updated && !hasSeriousError && (
            <span className="badge badge-success" style={{ flexShrink: 0 }}>✓ Reviewed</span>
          )}
        </div>

        {/* Backend Error Message (Priority) */}
        {localSheet.errorMessage && (
          <div className="error-alert-box">
            <span style={{ marginRight: 4 }}>🚫</span> {localSheet.errorMessage}
          </div>
        )}

        {/* Extracted result */}
        {resultEntries.length > 0 ? (
          <div className="result-list">
            {resultEntries.map(([k, v]) => {
              const fieldError = getFieldError(k);
              const strVal = (typeof v === 'object' && v !== null && v.value !== undefined) ? String(v.value) : String(v);

              return (
                <div className={`result-row ${fieldError ? 'row-error' : ''}`} key={k} title={fieldError?.error}>
                  <span className="result-key">{k}</span>
                  <span className="result-val">
                    {strVal}
                    {fieldError && <span className="error-dot" />}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center', padding: '10px 0' }}>
            ⚠ No data extracted
          </div>
        )}

        {/* Updated result details */}
        {localSheet.is_updated && localSheet.updated_result && (
          <div style={{
            background: 'var(--success-dim)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 8,
            padding: '5px 8px',
            fontSize: 12,
            color: 'var(--success)',
            marginBottom: 12,
            marginTop: 10
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓ Review Details Recorded</span>
            </div>
            <pre style={{
              margin: 0,
              fontSize: 11.5,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-secondary)',
              lineHeight: '1.4'
            }}>
              {JSON.stringify(localSheet.updated_result, null, 2)}
            </pre>
          </div>
        )}

        {saved && (
          <div style={{
            background: 'var(--success-dim)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 12,
            color: 'var(--success)',
            marginBottom: 8,
            animation: 'fadeIn 0.2s ease'
          }}>✓ Saved successfully!</div>
        )}

        {/* Manual Editing Revoked: Box is Read-Only */}

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
          {localSheet.last_modified
            ? `Modified: ${new Date(localSheet.last_modified).toLocaleString('en-IN')}`
            : ''}
        </div>
      </div>
    </div>
  );
}

export default function SheetViewerPage() {
  const { testId, batchId } = useParams();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);
  const [confirmReevaluate, setConfirmReevaluate] = useState(false);

  const lastFetchRef = useRef(null);

  useEffect(() => {
    const fetchKey = `${testId}-${batchId}`;
    // If we've already initiated a fetch for this specific batch/test, skip it (Prevents double-call in StrictMode)
    if (lastFetchRef.current === fetchKey) return;
    lastFetchRef.current = fetchKey;

    let ignore = false;

    const fetchSheets = async () => {
      setLoading(true);
      try {
        const [sheetsRes, testRes, templateRes] = await Promise.all([
          client.get(`/sheets/${batchId}`),
          client.get(`/tests/${testId}`),
          client.get(`/template/structure?testId=${testId}`)
        ]);

        if (ignore) return;

        // Convert template structure array to a lookup map and capture visual order
        const tMap = {};
        const tOrder = [];
        if (Array.isArray(templateRes.data)) {
          templateRes.data.forEach(item => {
            tMap[item.blockId] = item;
            tOrder.push(item.blockId);
          });
        }

        setSheets(sheetsRes.data);
        setTest({ ...testRes.data, templateMap: tMap, templateOrder: tOrder });
      } catch (e) {
        if (!ignore) {
          setError('Failed to load sheet records or template structure.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchSheets();

    return () => {
      ignore = true;
      lastFetchRef.current = null; // Allow re-fetching if we unmount and remount (e.g. back and forth)
    };
  }, [batchId, testId]);

  const filtered = sheets.filter(s =>
    s.sheetName.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleDeleteBatch = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await client.delete(`/batches/${batchId}`);
      navigate('/tests');
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error || e.message));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleReevaluateBatch = async () => {
    if (reevaluating) return;
    setReevaluating(true);
    try {
      await client.post(`/batches/re-evaluate/${batchId}`);
      // Redirect back to test management to see processing progress
      navigate('/tests');
    } catch (e) {
      alert('Re-evaluation failed: ' + (e.response?.data?.error || e.message));
      setReevaluating(false);
      setConfirmReevaluate(false);
    }
  };

  return (
    <div className="sheet-viewer-page">
      <div className="back-row">
        <button className="back-btn" onClick={() => navigate('/tests')}>
          ← Back to Tests
        </button>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Batch ID: <code style={{ color: 'var(--accent-light)' }}>{batchId}</code>
        </div>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Sheet Records</div>
          <div className="page-desc">
            {loading ? 'Loading...' : `${sheets.length} sheet${sheets.length !== 1 ? 's' : ''} • ${sheets.filter(s => s.is_updated).length} reviewed`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ width: 220, padding: '8px 14px', fontSize: 13 }}
            placeholder="🔍 Search sheets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {confirmReevaluate ? (
            <div style={{ display: 'flex', gap: 6, animation: 'fadeIn 0.2s ease' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmReevaluate(false)}>Cancel</button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleReevaluateBatch}
                disabled={reevaluating}
              >
                {reevaluating ? <span className="spinner spinner-sm" /> : 'Confirm Re-Run?'}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmReevaluate(true)}
              style={{ color: 'var(--text-secondary)', padding: '8px 12px' }}
              title="Re-run extraction engine for this batch"
            >
              ⚙️ Re-Evaluate
            </button>
          )}

          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 6, animation: 'fadeIn 0.2s ease' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteBatch}
                disabled={deleting}
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                {deleting ? 'Deleting...' : 'Erase Batch?'}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-ghost-danger btn-sm"
              onClick={() => setConfirmDelete(true)}
              style={{ color: 'var(--danger)', padding: '8px 12px' }}
              title="Delete this batch and all records"
            >
              🗑️ Delete Batch
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="spinner-page"><span className="spinner spinner-lg spinner-accent" /></div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Error loading sheets</div>
          <div className="empty-desc">{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <div className="empty-title">{search ? 'No matching sheets' : 'No sheets found'}</div>
          <div className="empty-desc">{search ? 'Try a different search term.' : 'This batch has no sheet records yet.'}</div>
        </div>
      ) : (
        <div className="sheets-grid">
          {filtered.map(sheet => (
            <SheetCard key={sheet._id} sheet={sheet} test={test} duplicateRolls={duplicateRolls} />
          ))}
        </div>
      )}
    </div>
  );
}
