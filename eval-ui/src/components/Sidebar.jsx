import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', icon: '📊', label: 'Dashboard', exact: true },
  { path: '/tests', icon: '📝', label: 'Test Management' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><img src="/favicon.png" alt="eVAL OMR" style={{ height: 'auto', width: '97%' }} /></div>
        <div className="sidebar-logo-text">
          eVAL<span>OMR</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'viewer'}</div>
          </div>
          <button
            id="sidebar-logout"
            className="logout-btn"
            onClick={logout}
            title="Logout"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#48b5e9">
              <path d="M10 3H4C3.45 3 3 3.45 3 4V20C3 20.55 3.45 21 4 21H10V19H5V5H10V3Z" />
              <path d="M21 12L16 7V10H9V14H16V17L21 12Z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
