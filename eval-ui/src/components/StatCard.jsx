export default function StatCard({ icon, label, value, variant = 'accent', sub }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? '–'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
