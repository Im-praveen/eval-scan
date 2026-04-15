export default function Header({ title, subtitle }) {
  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>
      <div className="header-actions">
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 12px'
        }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
