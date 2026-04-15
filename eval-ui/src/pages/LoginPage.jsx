import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    const result = await login(form.email, form.password);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📋</div>
          <h1 className="login-title">Eval<span style={{ color: 'var(--accent-light)' }}>Scan</span></h1>
          <p className="login-subtitle">OMR Sheet Evaluation System</p>
        </div>

        {error && (
          <div className="login-alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              name="email"
              placeholder="admin@eval.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : '🔓'}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Default: <code style={{ color: 'var(--accent-light)' }}>admin@eval.com</code> / <code style={{ color: 'var(--accent-light)' }}>Admin@123</code>
        </div>
      </div>
    </div>
  );
}
