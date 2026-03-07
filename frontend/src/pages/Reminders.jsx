import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useReminders } from '../contexts/ReminderContext';
import storage from '../services/storage';
import Toast from '../components/Toast';

function toast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
}

function formatDt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL = { pending: 'En attente', done: 'Traité', cancelled: 'Annulé' };
const STATUS_COLOR = { pending: '#0a84ff', done: '#34d399', cancelled: '#8e8e93' };

export default function Reminders() {
  const { user } = useAuth();
  const { reminders, reload, markDone, cancelReminder, snoozeAlert } = useReminders();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [filterAgent, setFilterAgent]   = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterDate, setFilterDate]     = useState('');
  const [snoozeId, setSnoozeId]         = useState(null);
  const [customSnooze, setCustomSnooze] = useState({ date: '', time: '' });

  const users = useMemo(() => storage.getUsers().filter(u => u.role === 'agent'), []);

  // Stats (admin only)
  const stats = useMemo(() => {
    if (!isAdmin) return null;
    const now = new Date();
    const all = reminders;
    const agentStats = {};
    users.forEach(u => {
      const agRem = all.filter(r => r.agent_id === u.id);
      agentStats[u.id] = {
        name: u.full_name || u.email,
        pending: agRem.filter(r => r.status === 'pending').length,
        done: agRem.filter(r => r.status === 'done').length,
        overdue: agRem.filter(r => r.status === 'pending' && new Date(r.scheduled_at) < now).length,
      };
    });
    return agentStats;
  }, [reminders, users, isAdmin]);

  const filtered = useMemo(() => {
    const now = new Date();
    return reminders.filter(r => {
      if (!isAdmin && r.agent_id !== user?.id) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterAgent && r.agent_id !== filterAgent) return false;
      if (filterDate && r.scheduled_at.slice(0, 10) !== filterDate) return false;
      return true;
    }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  }, [reminders, filterStatus, filterAgent, filterDate, isAdmin, user]);

  const handleSnoozeCustom = (remId) => {
    if (!customSnooze.date || !customSnooze.time) return;
    const dt = new Date(`${customSnooze.date}T${customSnooze.time}`);
    if (isNaN(dt.getTime()) || dt <= new Date()) { toast('Date invalide ou passée', 'error'); return; }
    storage.updateReminder(remId, {
      scheduled_at: dt.toISOString(),
      notified_pre: false,
      notified_main: false,
    });
    reload();
    toast('Rappel reporté', 'success');
    setSnoozeId(null);
    setCustomSnooze({ date: '', time: '' });
  };

  const handleQuickSnooze = (remId, mins) => {
    const dt = new Date(Date.now() + mins * 60000);
    storage.updateReminder(remId, {
      scheduled_at: dt.toISOString(),
      notified_pre: false,
      notified_main: false,
    });
    reload();
    toast(`Reporté de ${mins} min`, 'success');
  };

  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-top">
        <div className="page-header">
          <div>
            <div className="page-title">Rappels</div>
            <div className="page-subtitle">
              {isAdmin ? `${reminders.filter(r => r.status === 'pending').length} en attente · tous les agents` : `${reminders.filter(r => r.status === 'pending' && r.agent_id === user?.id).length} en attente`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin stats ────────────────────────────────────────── */}
      {isAdmin && stats && Object.keys(stats).length > 0 && (
        <div className="page-top" style={{ paddingTop: 0 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(stats).map(([id, s]) => (
              <div key={id} className="card" style={{ padding: '12px 16px', flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a84ff' }}>{s.pending}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>En attente</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{s.done}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Traités</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.overdue > 0 ? '#fb7185' : 'var(--text-muted)' }}>{s.overdue}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Retard</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="page-top" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="done">Traités</option>
            <option value="cancelled">Annulés</option>
          </select>
          {isAdmin && (
            <select className="filter-select" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
              <option value="">Tous les agents</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          )}
          <input type="date" className="filter-select" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ minWidth: 140 }} />
          {(filterStatus !== 'pending' || filterAgent || filterDate) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus('pending'); setFilterAgent(''); setFilterDate(''); }}>
              Réinitialiser
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="page-scroll">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>Aucun rappel.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date prévue</th>
                    <th>Prospect</th>
                    {isAdmin && <th>Agent</th>}
                    <th>Note</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const scheduled = new Date(r.scheduled_at);
                    const isOverdue = r.status === 'pending' && scheduled < now;
                    const in15 = r.status === 'pending' && !isOverdue && (scheduled - now) <= 16 * 60 * 1000;

                    return (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: isOverdue ? '#fb7185' : in15 ? '#ff9f0a' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isOverdue && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                            {formatDt(r.scheduled_at)}
                          </div>
                          {isOverdue && <div style={{ fontSize: '0.7rem', color: '#fb7185' }}>En retard</div>}
                          {in15 && <div style={{ fontSize: '0.7rem', color: '#ff9f0a' }}>Dans 15 min</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.lead_name || '—'}</div>
                          {r.lead_phone && (
                            <a href={`tel:${r.lead_phone}`} style={{ fontSize: '0.75rem', color: '#0a84ff' }}>{r.lead_phone}</a>
                          )}
                        </td>
                        {isAdmin && <td className="td-muted">{r.agent_name || '—'}</td>}
                        <td className="td-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.note || '—'}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', padding: '2px 8px', borderRadius: 100,
                            fontSize: '0.72rem', fontWeight: 600,
                            background: (STATUS_COLOR[r.status] || '#8e8e93') + '1a',
                            color: STATUS_COLOR[r.status] || '#8e8e93',
                          }}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {r.lead_id && (
                              <button className="btn btn-ghost btn-icon btn-sm" title="Voir la fiche" onClick={() => navigate(`/leads/${r.lead_id}`)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                              </button>
                            )}
                            {r.status === 'pending' && (
                              <>
                                <button className="btn btn-ghost btn-icon btn-sm" title="Traité" style={{ color: '#34d399' }} onClick={() => { markDone(r.id, r.lead_id); toast('Rappel traité', 'success'); }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>
                                <button className="btn btn-ghost btn-icon btn-sm" title="Reporter" style={{ color: '#ff9f0a' }} onClick={() => setSnoozeId(r.id)}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                </button>
                                <button className="btn btn-ghost btn-icon btn-sm" title="Annuler" style={{ color: '#fb7185' }} onClick={() => { cancelReminder(r.id); toast('Rappel annulé', 'success'); }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Snooze modal ───────────────────────────────────────── */}
      {snoozeId && (
        <div className="modal-overlay" onClick={() => setSnoozeId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Reporter le rappel</div>
              <button className="modal-close" onClick={() => setSnoozeId(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  { label: '+15 min', mins: 15 },
                  { label: '+30 min', mins: 30 },
                  { label: '+1 heure', mins: 60 },
                  { label: '+2 heures', mins: 120 },
                ].map(opt => (
                  <button key={opt.mins} className="btn btn-secondary btn-sm" onClick={() => { handleQuickSnooze(snoozeId, opt.mins); setSnoozeId(null); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Date et heure personnalisées</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="form-control" value={customSnooze.date} min={new Date().toISOString().slice(0, 10)} onChange={e => setCustomSnooze(s => ({ ...s, date: e.target.value }))} />
                  <input type="time" className="form-control" value={customSnooze.time} onChange={e => setCustomSnooze(s => ({ ...s, time: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSnoozeId(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => handleSnoozeCustom(snoozeId)} disabled={!customSnooze.date || !customSnooze.time}>
                Reporter
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}
