import { useState } from 'react';
import client from '../api/client';

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export default function CreateTestModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', conductDate: today() });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Test name is required';
    if (!form.conductDate) {
      e.conductDate = 'Conduct date is required';
    } else {
      const chosen = new Date(form.conductDate);
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      if (chosen < todayD) e.conductDate = 'Date must be today or a future date';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const { data } = await client.post('/tests', {
        name: form.name.trim(),
        conductDate: form.conductDate
      });
      onCreated(data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.error
        || 'Failed to create test';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">➕ Create New Test</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {apiError && (
              <div className="login-alert" style={{ marginBottom: 16 }}>
                <span>⚠️</span> {apiError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Test Name *</label>
              <input
                id="test-name-input"
                className="form-input"
                type="text"
                name="name"
                placeholder="e.g. Mathematics Final Exam 2026"
                value={form.name}
                onChange={handleChange}
                autoFocus
              />
              {errors.name && <div className="form-error">⚠ {errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Conduct Date *</label>
              <input
                id="test-date-input"
                className="form-input"
                type="date"
                name="conductDate"
                value={form.conductDate}
                min={today()}
                onChange={handleChange}
              />
              {errors.conductDate && <div className="form-error">⚠ {errors.conductDate}</div>}
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>
                Only today or future dates are allowed
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button id="create-test-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : '✓'}
              {loading ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
