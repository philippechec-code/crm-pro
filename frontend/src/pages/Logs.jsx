import { useEffect, useState } from 'react';
import storage from '../services/storage';
import Toast from '../components/Toast';

function toast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const ROLE_LABEL = { admin: 'Administrateur', agent: 'Agent' };
const ROLE_COLOR = { admin: '#f472b6', agent: '#38bdf8' };

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterRole, setFilterRole] = useState('');

  function reload() { setLogs(storage.getLogs()); }
  useEffect(() => { reload(); }, []);

  const handleClear = () => {
    if (!confirm('Effacer tous les logs de connexion ?')) return;
    storage.clearLogs();
    toast('Logs effacés', 'success');
    reload();
  };

  const filtered = logs.filter(l => {
    if (filterRole && l.user_role !== filterRole) return false;
    if (filterUser) {
      const q = filterUser.toLowerCase();
      if (!l.user_name?.toLowerCase().includes(q) && !l.user_email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-top">
        <div className="page-header">
          <div>
            <div className="page-title">Logs de connexion</div>
            <div className="page-subtitle">{logs.length} entrée{logs.length !== 1 ? 's' : ''} (500 max)</div>
          </div>
          <div className="header-actions">
            <button className="btn btn-danger btn-sm" onClick={handleClear} disabled={logs.length === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Effacer les logs
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="page-top" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="filter-select"
            style={{ minWidth: 200 }}
            placeholder="Rechercher un utilisateur…"
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
          />
          <select className="filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="agent">Agent</option>
          </select>
          {(filterUser || filterRole) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterUser(''); setFilterRole(''); }}>
              Réinitialiser
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="page-scroll">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{logs.length === 0 ? 'Aucune connexion enregistrée.' : "Aucun résultat pour ces filtres."}</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date / Heure</th>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Navigateur</th>
                    <th>Système</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {formatDate(l.logged_at)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.user_name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.user_email || ''}</div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: 100,
                          fontSize: '0.72rem', fontWeight: 600,
                          background: (ROLE_COLOR[l.user_role] || '#8e8e93') + '1a',
                          color: ROLE_COLOR[l.user_role] || '#8e8e93',
                        }}>
                          {ROLE_LABEL[l.user_role] || l.user_role || '—'}
                        </span>
                      </td>
                      <td className="td-muted">{l.browser || '—'}</td>
                      <td className="td-muted">{l.os || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Toast />
    </div>
  );
}
