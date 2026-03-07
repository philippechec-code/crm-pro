import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ReminderScheduler from './ReminderScheduler';
import ReminderAlerts from './ReminderAlerts';
import Toast from './Toast';
import { useReminders } from '../contexts/ReminderContext';
import { useEffect, useState } from 'react';

export default function Layout() {
  const [time, setTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { pendingCount } = useReminders();

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <div className="main-content">
        <header className="main-header">
          <button
            className="btn btn-ghost btn-icon sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            title="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="clock">
            <span>{time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            <span className="clock-seconds">{time.toLocaleTimeString([], {second:'2-digit'})}</span>
          </div>

          {/* Bell button */}
          <button
            onClick={() => navigate('/reminders')}
            title="Rappels"
            style={{
              position: 'relative', marginLeft: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              color: pendingCount > 0 ? '#ff9f0a' : 'var(--text-muted)',
              padding: 6, borderRadius: 8,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                background: '#ff453a', color: 'white',
                fontSize: '0.6rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      <ReminderScheduler />
      <ReminderAlerts />
      <Toast />
    </div>
  );
}
