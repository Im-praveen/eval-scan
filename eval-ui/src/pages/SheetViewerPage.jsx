import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

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

function SheetCard({ sheet, test, apiBase }) {
  const [lightbox, setLightbox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localSheet, setLocalSheet] = useState(sheet);

  const token = localStorage.getItem('eval_token') || '';
  const imgSrc = `${apiBase}/api/sheets/image/${sheet._id}?token=${token}`;

  let resultEntries = [];
  if (localSheet.result && typeof localSheet.result === 'object') {
    if (test && test.blockOrder && test.blockOrder.length > 0) {
      resultEntries = test.blockOrder
        .filter(k => localSheet.result[k] !== undefined)
        .map(k => [k, localSheet.result[k]])
        .slice(0, 6);
    } else {
      resultEntries = Object.entries(localSheet.result).slice(0, 6);
    }
  }

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

  return (
    <div className="sheet-card">
      {lightbox && <Lightbox src={imgSrc} name={localSheet.sheetName} onClose={() => setLightbox(false)} />}

      <div className="sheet-image-wrap" onClick={() => setLightbox(true)}>
        <img src={imgSrc} alt={localSheet.sheetName} loading="lazy"
          onError={(e) => { e.target.src = ''; e.target.parentElement.style.background = 'var(--bg-input)'; }} />
        <div className="sheet-img-overlay">
          <span className="sheet-img-overlay-icon">🔍</span>
        </div>
      </div>

      <div className="sheet-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="sheet-name" title={localSheet.sheetName}>{localSheet.sheetName}</div>
          {localSheet.is_updated && (
            <span className="badge badge-success" style={{ flexShrink: 0 }}>✓ Reviewed</span>
          )}
        </div>

        {/* Extracted result */}
        {resultEntries.length > 0 ? (
          <div className="result-list">
            {resultEntries.map(([k, v]) => (
              <div className="result-row" key={k}>
                <span className="result-key">{k}</span>
                <span className="result-val">{(typeof v === 'object' && v !== null && v.value !== undefined) ? String(v.value) : String(v)}</span>
              </div>
            ))}
            {Object.keys(localSheet.result || {}).length > 6 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                +{Object.keys(localSheet.result).length - 6} more questions
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>No extracted result</div>
        )}

        {/* Updated result */}
        {localSheet.is_updated && localSheet.updated_result && (
          <div style={{
            background: 'var(--success-dim)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--success)',
            marginBottom: 8
          }}>
            ✓ Reviewed result saved
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

        {!editing ? (
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={startEdit}
          >
            ✏️ {localSheet.is_updated ? 'Edit Review' : 'Add Review'}
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>
              Updated Result (JSON or plain text):
            </div>
            <textarea
              className="form-input form-textarea"
              rows={4}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              style={{ fontSize: 12, resize: 'vertical', marginBottom: 8 }}
              placeholder='e.g. {"Q1":"A","Q2":"B"}'
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '💾'}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

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

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const [sheetsRes, testRes] = await Promise.all([
          client.get(`/sheets/${batchId}`),
          client.get(`/tests/${testId}`)
        ]);
        setSheets(sheetsRes.data);
        setTest(testRes.data);
      } catch (e) {
        setError('Failed to load sheet records.');
      } finally {
        setLoading(false);
      }
    };
    fetchSheets();
  }, [batchId]);

  const filtered = sheets.filter(s =>
    s.sheetName.toLowerCase().includes(search.toLowerCase())
  );

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
        <input
          className="form-input"
          style={{ width: 220, padding: '8px 14px', fontSize: 13 }}
          placeholder="🔍 Search sheets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
            <SheetCard key={sheet._id} sheet={sheet} test={test} apiBase={API_BASE} />
          ))}
        </div>
      )}
    </div>
  );
}
