import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import client from '../api/client';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timeAgo = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return formatDate(d);
};

const STATUS_BADGE = {
  scheduled: 'badge-accent',
  active: 'badge-success',
  completed: 'badge-info',
  pending: 'badge-warning',
  processing: 'badge-warning',
  failed: 'badge-danger',
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const { data } = await client.get('/dashboard/stats');
      setStats(data);
    } catch (e) {
      setError('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div className="spinner-page">
      <span className="spinner spinner-lg spinner-accent" />
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <div className="empty-icon">⚠️</div>
      <div className="empty-title">Could not load stats</div>
      <div className="empty-desc">{error}</div>
      <button className="btn btn-secondary" onClick={fetchStats}>Retry</button>
    </div>
  );

  const s = stats || {};

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard icon="📝" label="Total Tests" value={s.totalTests} variant="accent" />
        <StatCard icon="📦" label="Total Batches" value={s.totalBatches} variant="info" />
        <StatCard icon="🗂️" label="Sheets Processed" value={s.totalSheets} variant="success" />
        <StatCard icon="⏳" label="In Processing" value={s.processingBatches} variant="warning" />
        <StatCard icon="✅" label="Completed Batches" value={s.completedBatches} variant="success" sub={`${s.failedBatches || 0} failed`} />
        <StatCard icon="✏️" label="Reviewed Sheets" value={s.updatedSheets} variant="accent" sub="manually updated" />
      </div>

      {/* Two-column bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Tests */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Tests</div>
              <div className="card-subtitle">Latest 5 tests created</div>
            </div>
          </div>
          {(!s.recentTests || s.recentTests.length === 0) ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-icon" style={{ fontSize: 32 }}>📝</div>
              <div className="empty-desc">No tests yet</div>
            </div>
          ) : (
            <div className="activity-list">
              {s.recentTests.map(t => (
                <div className="activity-item" key={t._id}>
                  <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                  <div className="activity-text">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {formatDate(t.conductDate)}</div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[t.status] || 'badge-muted'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Batches */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Batches</div>
              <div className="card-subtitle">Latest processing activity</div>
            </div>
          </div>
          {(!s.recentBatches || s.recentBatches.length === 0) ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-icon" style={{ fontSize: 32 }}>📦</div>
              <div className="empty-desc">No batches uploaded yet</div>
            </div>
          ) : (
            <div className="activity-list">
              {s.recentBatches.map(b => (
                <div className="activity-item" key={b._id}>
                  <div className="activity-dot" style={{
                    background: b.status === 'completed' ? 'var(--success)'
                      : b.status === 'failed' ? 'var(--danger)'
                        : 'var(--warning)'
                  }} />
                  <div className="activity-text">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.testID?.name || 'Unknown Test'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(b.createdAt)}</div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[b.status] || 'badge-muted'}`}>{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
