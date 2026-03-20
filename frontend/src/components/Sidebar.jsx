import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useReminders } from '../contexts/ReminderContext';

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  groups: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z"/>
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  reminders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  logs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function Sidebar({ open }) {
  const { user, logout, isAdmin } = useAuth();
  const { pendingCount } = useReminders();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || '?';

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar-logo">
        <h1>CRM Télépro</h1>
        <span>Gestion des leads</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Principal</div>

        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          {icons.dashboard} <span>Tableau de bord</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/leads" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            {icons.leads} <span>Prospects</span>
          </NavLink>
        )}

        <NavLink to="/reminders" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          {icons.reminders}
          <span>Rappels</span>
          {pendingCount > 0 && (
            <span style={{
              marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
              background: '#ff453a', color: 'white',
              fontSize: '0.62rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </NavLink>

        {isAdmin && (
          <>
            <div className="nav-section-label" style={{marginTop: 12}}>Administration</div>
            <NavLink to="/groups" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {icons.groups} <span>Groupes</span>
            </NavLink>
            <NavLink to="/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {icons.users} <span>Utilisateurs</span>
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {icons.logs} <span>Logs connexion</span>
            </NavLink>
            <NavLink to="/security" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {icons.security} <span>Sécurité</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.username}</div>
            <div className="user-role">{user?.role === 'admin' ? 'Administrateur' : 'Agent'}</div>
          </div>
          <button className="btn-logout" onClick={logout} title="Déconnexion">
            {icons.logout}
          </button>
        </div>
      </div>
    </aside>
  );
}
