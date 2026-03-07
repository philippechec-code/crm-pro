import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import storage from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import CSVImportModal from '../components/CSVImportModal';

function toast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups]   = useState([]);
  const [leads, setLeads]     = useState([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState({ name: '', description: '', color: '#60a5fa' });

  // Edit modal
  const [editGroup, setEditGroup]   = useState(null);
  const [editForm, setEditForm]     = useState({});

  // Leads panel
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState(new Set());

  // CSV import modal
  const [importGroup, setImportGroup] = useState(null); // group object when modal is open

  function reload() {
    setGroups(storage.getGroups());
    setLeads(storage.getLeads());
  }

  useEffect(() => { reload(); }, []);

  // Leads count + leads list per group
  const groupLeads = useMemo(() => {
    const map = {};
    groups.forEach(g => { map[g.id] = leads.filter(l => l.group_id === g.id); });
    return map;
  }, [groups, leads]);

  const handleCreate = () => {
    if (!form.name.trim()) { toast('Nom requis', 'error'); return; }
    storage.createGroup(form);
    toast('Groupe créé', 'success');
    setForm({ name: '', description: '', color: '#60a5fa' });
    setShowCreate(false);
    reload();
  };

  const handleEdit = () => {
    if (!editForm.name?.trim()) { toast('Nom requis', 'error'); return; }
    storage.updateGroup(editGroup.id, editForm);
    toast('Groupe mis à jour', 'success');
    setEditGroup(null);
    reload();
  };

  const handleDelete = (id) => {
    if (!confirm('Supprimer ce groupe ? Les leads ne seront pas supprimés.')) return;
    const ok = storage.deleteGroup(id);
    if (!ok) { toast('Impossible de supprimer un groupe intégré', 'error'); return; }
    toast('Groupe supprimé', 'success');
    if (activeGroup === id) setActiveGroup(null);
    reload();
  };

  const moveLeadToGroup = (leadId, groupId) => {
    storage.updateLead(leadId, { group_id: groupId || null }, user?.id);
    reload();
  };

  const handleDeleteLead = (leadId) => {
    if (!confirm('Supprimer ce prospect définitivement ?')) return;
    storage.deleteLead(leadId);
    setSelectedLeads(prev => { const s = new Set(prev); s.delete(leadId); return s; });
    reload();
    toast('Prospect supprimé', 'success');
  };

  const handleBulkDeleteLeads = () => {
    if (selectedLeads.size === 0) return;
    if (!confirm(`Supprimer ${selectedLeads.size} prospect(s) définitivement ?`)) return;
    selectedLeads.forEach(id => storage.deleteLead(id));
    setSelectedLeads(new Set());
    reload();
    toast(`${selectedLeads.size > 1 ? selectedLeads.size + ' prospects supprimés' : 'Prospect supprimé'}`, 'success');
  };

  const toggleSelectLead = (id) => {
    setSelectedLeads(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAllLeads = () => {
    const all = groupLeads[activeGroup] || [];
    if (selectedLeads.size === all.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(all.map(l => l.id)));
    }
  };

  const closeImportModal = () => {
    setImportGroup(null);
    reload();
  };

  // Reset selection when switching groups
  useEffect(() => { setSelectedLeads(new Set()); }, [activeGroup]);

  const active = groups.find(g => g.id === activeGroup);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-top">
        <div className="page-header">
          <div>
            <div className="page-title">Groupes</div>
            <div className="page-subtitle">{groups.length} groupe{groups.length !== 1 ? 's' : ''}</div>
          </div>
          {user?.role === 'admin' && (
            <div className="header-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nouveau groupe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="page-scroll">

        {/* ── Group cards ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
          {groups.map(g => {
            const count   = (groupLeads[g.id] || []).length;
            const isOpen  = activeGroup === g.id;
            const color   = g.color || '#60a5fa';
            return (
              <div
                key={g.id}
                className="card"
                style={{
                  padding: 0, cursor: 'pointer',
                  border: isOpen ? `2px solid ${color}60` : '1px solid var(--border)',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => setActiveGroup(isOpen ? null : g.id)}
              >
                {/* Card top strip */}
                <div style={{ height: 4, borderRadius: '12px 12px 0 0', background: color }} />

                <div style={{ padding: '16px 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: color + '1a', color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z"/>
                        </svg>
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{g.name}</div>
                        {g.builtin && <span style={{ fontSize: '0.68rem', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Intégré</span>}
                      </div>
                    </div>

                    {/* Admin actions */}
                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Importer CSV"
                          onClick={() => { setImportGroup(g); setImportResult(null); setImportSource(''); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </button>
                        {!g.builtin && (
                          <>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Modifier"
                              onClick={() => { setEditGroup(g); setEditForm({ name: g.name, description: g.description, color: g.color }); }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="btn btn-danger btn-icon btn-sm" title="Supprimer" onClick={() => handleDelete(g.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {g.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>{g.description}</p>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{count}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>prospect{count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {/* Expand hint */}
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: isOpen ? color : 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    {isOpen ? 'Masquer les prospects' : 'Voir les prospects'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Leads panel for selected group ───────────────────── */}
        {activeGroup && (
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: active?.color, flexShrink: 0 }} />
                <div className="card-title" style={{ fontWeight: 700 }}>
                  Prospects — {active?.name}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(groupLeads[activeGroup] || []).length} prospect{(groupLeads[activeGroup] || []).length !== 1 ? 's' : ''}
                </span>
              </div>
              {user?.role === 'admin' && (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leads')}>
                  Gérer dans Prospects
                </button>
              )}
            </div>

            {(groupLeads[activeGroup] || []).length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <p>Aucun prospect dans ce groupe</p>
              </div>
            ) : (
              <>
                {/* Bulk action bar */}
                {selectedLeads.size > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px',
                    background: 'rgba(10,132,255,0.08)', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {selectedLeads.size} sélectionné{selectedLeads.size > 1 ? 's' : ''}
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={handleBulkDeleteLeads}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      Supprimer ({selectedLeads.size})
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLeads(new Set())}>
                      Annuler
                    </button>
                  </div>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {user?.role === 'admin' && (
                          <th style={{ width: 36 }}>
                            <input
                              type="checkbox"
                              checked={selectedLeads.size === (groupLeads[activeGroup] || []).length && (groupLeads[activeGroup] || []).length > 0}
                              onChange={toggleAllLeads}
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                        )}
                        <th>Nom</th>
                        <th>Téléphone</th>
                        <th className="col-email">Email</th>
                        <th>Statut</th>
                        <th className="col-source">Source</th>
                        {user?.role === 'admin' && <th>Déplacer vers</th>}
                        {user?.role === 'admin' && <th style={{ width: 40 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(groupLeads[activeGroup] || []).map(l => (
                        <tr key={l.id} style={{ cursor: 'pointer', background: selectedLeads.has(l.id) ? 'rgba(10,132,255,0.06)' : undefined }} onClick={() => navigate(`/leads/${l.id}`)}>
                          {user?.role === 'admin' && (
                            <td onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedLeads.has(l.id)}
                                onChange={() => toggleSelectLead(l.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          <td style={{ fontWeight: 600 }}>
                            {[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                            {l.city && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.city}</div>}
                          </td>
                          <td className="td-muted">{l.phone || '—'}</td>
                          <td className="td-muted col-email">{l.email || '—'}</td>
                          <td>
                            <StatusBadge status={l.status} />
                          </td>
                          <td className="td-muted col-source">
                            {l.source
                              ? <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:100, fontSize:'0.72rem', fontWeight:600, background:'rgba(255,255,255,0.06)', color:'var(--text-secondary)' }}>{l.source}</span>
                              : '—'
                            }
                          </td>
                          {user?.role === 'admin' && (
                            <td onClick={e => e.stopPropagation()}>
                              <select
                                className="filter-select"
                                value={l.group_id || ''}
                                onChange={e => moveLeadToGroup(l.id, e.target.value || null)}
                                style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                              >
                                <option value="">Sans groupe</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            </td>
                          )}
                          {user?.role === 'admin' && (
                            <td onClick={e => e.stopPropagation()}>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                title="Supprimer"
                                style={{ color: '#fb7185' }}
                                onClick={() => handleDeleteLead(l.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Leads sans groupe */}
        {!activeGroup && (
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Prospects sans groupe</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {leads.filter(l => !l.group_id).length} prospect{leads.filter(l => !l.group_id).length !== 1 ? 's' : ''} non assignés à un groupe
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>
                Voir dans Prospects →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Nouveau groupe ───────────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Nouveau groupe</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: VIP, Relance…" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optionnel" />
              </div>
              <div className="form-group">
                <label className="form-label">Couleur</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                    style={{ width: 42, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--border)', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{form.color}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCreate}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Modifier groupe ──────────────────────────────── */}
      {editGroup && (
        <div className="modal-overlay" onClick={() => setEditGroup(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Modifier — {editGroup.name}</div>
              <button className="modal-close" onClick={() => setEditGroup(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-control" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Couleur</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={editForm.color || '#60a5fa'} onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                    style={{ width: 42, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--border)', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{editForm.color}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditGroup(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Importer CSV ─────────────────────────────────── */}
      {importGroup && (
        <CSVImportModal
          groups={groups}
          onClose={closeImportModal}
          currentUserId={user?.id}
        />
      )}

      <Toast />
    </div>
  );
}

// Inline status badge (évite import circulaire)
function StatusBadge({ status }) {
  const statuses = storage.getStatuses();
  const s = statuses.find(x => x.id === status);
  const color = s?.color || '#8e8e93';
  const label = s?.label || status || '—';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 100,
      fontSize: '0.72rem', fontWeight: 600,
      background: color + '1a', color,
    }}>
      {label}
    </span>
  );
}
