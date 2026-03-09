import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
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

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStep, setExportStep] = useState('filter'); // 'filter' | 'confirm'
  const [exportSelectedGroups, setExportSelectedGroups] = useState(new Set());
  const [exportSelectedStatuses, setExportSelectedStatuses] = useState(new Set());
  const [exportSelectedSources, setExportSelectedSources] = useState(new Set());
  const [exportFormat, setExportFormat] = useState('xlsx');

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

  const openExportModal = () => {
    const allStatuses = storage.getStatuses();
    const allSources  = [...new Set(leads.map(l => l.source).filter(Boolean))].sort();
    setExportSelectedGroups(new Set(groups.map(g => g.id)));
    setExportSelectedStatuses(new Set(allStatuses.map(s => s.id)));
    setExportSelectedSources(new Set(allSources));
    setExportFormat('xlsx');
    setExportStep('filter');
    setShowExportModal(true);
  };

  const toggleExportGroup = (id) => {
    setExportSelectedGroups(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAllExportGroups = () => {
    if (exportSelectedGroups.size === groups.length) {
      setExportSelectedGroups(new Set());
    } else {
      setExportSelectedGroups(new Set(groups.map(g => g.id)));
    }
  };

  const toggleExportStatus = (id) => {
    setExportSelectedStatuses(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAllExportStatuses = (allStatuses) => {
    if (exportSelectedStatuses.size === allStatuses.length) {
      setExportSelectedStatuses(new Set());
    } else {
      setExportSelectedStatuses(new Set(allStatuses.map(s => s.id)));
    }
  };

  const toggleExportSource = (src) => {
    setExportSelectedSources(prev => {
      const s = new Set(prev);
      s.has(src) ? s.delete(src) : s.add(src);
      return s;
    });
  };

  const toggleAllExportSources = (allSources) => {
    if (exportSelectedSources.size === allSources.length) {
      setExportSelectedSources(new Set());
    } else {
      setExportSelectedSources(new Set(allSources));
    }
  };

  const goToConfirm = () => {
    if (exportSelectedGroups.size === 0)   { toast('Sélectionnez au moins un groupe', 'error'); return; }
    if (exportSelectedStatuses.size === 0) { toast('Sélectionnez au moins un statut', 'error'); return; }
    if (exportSelectedSources.size === 0)  { toast('Sélectionnez au moins une source', 'error'); return; }
    setExportStep('confirm');
  };

  const handleExport = () => {
    setShowExportModal(false);
    const users    = storage.getUsers();
    const statuses = storage.getStatuses();
    const date     = new Date().toISOString().slice(0, 10);
    const fileName = `groupes_export_${date}.${exportFormat}`;

    const userName    = (id) => users.find(u => u.id === id)?.full_name || '—';
    const statusLabel = (id) => statuses.find(s => s.id === id)?.label || id || '—';

    const rows = [];
    groups.filter(g => exportSelectedGroups.has(g.id)).forEach(g => {
      const gLeads = (groupLeads[g.id] || []).filter(l =>
        exportSelectedStatuses.has(l.status) && exportSelectedSources.has(l.source || '')
      );
      rows.push({
        Groupe: g.name, 'Nb prospects': gLeads.length,
        Prénom: '', Nom: '', Téléphone: '', Email: '',
        Statut: '', Source: '', 'Agent assigné': '', 'Date de création': '',
      });
      gLeads.forEach(l => {
        rows.push({
          Groupe: '', 'Nb prospects': '',
          Prénom:             l.first_name  || '—',
          Nom:                l.last_name   || '—',
          Téléphone:          l.phone       || '—',
          Email:              l.email       || '—',
          Statut:             statusLabel(l.status),
          Source:             l.source      || '—',
          'Agent assigné':    l.assigned_to ? userName(l.assigned_to) : '—',
          'Date de création': l.created_at  ? new Date(l.created_at).toLocaleDateString('fr-FR') : '—',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Groupes');

    if (exportFormat === 'csv') {
      const csv  = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    } else {
      XLSX.writeFile(wb, fileName);
    }
    const total = groups
      .filter(g => exportSelectedGroups.has(g.id))
      .reduce((n, g) => n + (groupLeads[g.id] || []).filter(l =>
        exportSelectedStatuses.has(l.status) && exportSelectedSources.has(l.source || '')
      ).length, 0);
    toast(`${total} prospect${total !== 1 ? 's' : ''} exporté${total !== 1 ? 's' : ''} en ${exportFormat.toUpperCase()}`, 'success');
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
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm" onClick={openExportModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exporter
            </button>
            {user?.role === 'admin' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nouveau groupe
              </button>
            )}
          </div>
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

      {/* ── Modal: Exporter ─────────────────────────────────────── */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {exportStep === 'confirm' && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExportStep('filter')} title="Retour">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                )}
                <div className="modal-title">
                  {exportStep === 'filter' ? 'Exporter les groupes' : 'Confirmer l\'export'}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {exportStep === 'confirm' && (() => {
                const allStatuses = storage.getStatuses();
                const allSources  = [...new Set(leads.map(l => l.source).filter(Boolean))].sort();
                const matchLead   = (l) => exportSelectedStatuses.has(l.status) && exportSelectedSources.has(l.source || '');
                const exportTotal = groups.filter(g => exportSelectedGroups.has(g.id)).reduce((n, g) => n + (groupLeads[g.id] || []).filter(matchLead).length, 0);
                const selGroups   = groups.filter(g => exportSelectedGroups.has(g.id));
                const selStatuses = allStatuses.filter(s => exportSelectedStatuses.has(s.id));
                const selSources  = allSources.filter(s => exportSelectedSources.has(s));
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Récap groupes */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Groupes ({selGroups.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {selGroups.map(g => {
                          const count = (groupLeads[g.id] || []).filter(matchLead).length;
                          return (
                            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color || '#60a5fa', flexShrink: 0 }} />
                              <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 600 }}>{g.name}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{count} prospect{count !== 1 ? 's' : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Récap statuts */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Statuts ({selStatuses.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {selStatuses.map(s => (
                          <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 600, background: s.color + '1a', color: s.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Récap sources */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Sources ({selSources.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {selSources.map(src => (
                          <span key={src} style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Total + format */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.2)' }}>
                      <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{exportTotal}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>prospect{exportTotal !== 1 ? 's' : ''} à exporter</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(10,132,255,0.15)', color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {exportFormat.toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {exportStep === 'filter' && (() => {
                const allStatuses = storage.getStatuses();
                const allSources  = [...new Set(leads.map(l => l.source).filter(Boolean))].sort();
                const matchLead   = (l) => exportSelectedStatuses.has(l.status) && exportSelectedSources.has(l.source || '');
                const exportTotal = groups
                  .filter(g => exportSelectedGroups.has(g.id))
                  .reduce((n, g) => n + (groupLeads[g.id] || []).filter(matchLead).length, 0);
                return (
                  <>
                    {/* Sélection des groupes */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <label className="form-label" style={{ margin: 0 }}>Groupes à exporter</label>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={toggleAllExportGroups}>
                          {exportSelectedGroups.size === groups.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                        {groups.map(g => {
                          const count   = (groupLeads[g.id] || []).filter(matchLead).length;
                          const checked = exportSelectedGroups.has(g.id);
                          return (
                            <label key={g.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                              padding: '8px 12px', borderRadius: 8,
                              border: `1px solid ${checked ? (g.color || '#60a5fa') + '60' : 'var(--border)'}`,
                              background: checked ? (g.color || '#60a5fa') + '0d' : 'transparent',
                              transition: 'all 0.15s',
                            }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleExportGroup(g.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color || '#60a5fa', flexShrink: 0 }} />
                              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{count} prospect{count !== 1 ? 's' : ''}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sélection des statuts */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <label className="form-label" style={{ margin: 0 }}>Statuts à inclure</label>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => toggleAllExportStatuses(allStatuses)}>
                          {exportSelectedStatuses.size === allStatuses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {allStatuses.map(s => {
                          const checked = exportSelectedStatuses.has(s.id);
                          return (
                            <label key={s.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                              padding: '5px 10px', borderRadius: 100,
                              border: `1px solid ${checked ? s.color + '80' : 'var(--border)'}`,
                              background: checked ? s.color + '1a' : 'transparent',
                              fontSize: '0.78rem', fontWeight: 600,
                              color: checked ? s.color : 'var(--text-muted)',
                              transition: 'all 0.15s',
                            }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleExportStatus(s.id)} style={{ display: 'none' }} />
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: checked ? s.color : 'var(--text-muted)', flexShrink: 0 }} />
                              {s.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sélection des sources */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <label className="form-label" style={{ margin: 0 }}>Sources à inclure</label>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => toggleAllExportSources(allSources)}>
                          {exportSelectedSources.size === allSources.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                      {allSources.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune source renseignée</div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {allSources.map(src => {
                            const checked = exportSelectedSources.has(src);
                            return (
                              <label key={src} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                padding: '5px 10px', borderRadius: 100,
                                border: `1px solid ${checked ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
                                background: checked ? 'rgba(255,255,255,0.08)' : 'transparent',
                                fontSize: '0.78rem', fontWeight: 600,
                                color: checked ? 'var(--text-primary)' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                              }}>
                                <input type="checkbox" checked={checked} onChange={() => toggleExportSource(src)} style={{ display: 'none' }} />
                                {src}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Résumé */}
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exportTotal}</span>{' '}
                      prospect{exportTotal !== 1 ? 's' : ''} sera{exportTotal !== 1 ? 'ont' : ''} exporté{exportTotal !== 1 ? 's' : ''}{' '}
                      <span style={{ color: 'var(--text-muted)' }}>
                        ({exportSelectedGroups.size} groupe{exportSelectedGroups.size !== 1 ? 's' : ''},{' '}
                        {exportSelectedStatuses.size} statut{exportSelectedStatuses.size !== 1 ? 's' : ''},{' '}
                        {exportSelectedSources.size} source{exportSelectedSources.size !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </>
                );
              })()}
              {exportStep === 'filter' && (
              /* Format */
              <div>
                <label className="form-label">Format d'export</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'xlsx', label: 'Excel (.xlsx)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
                    { value: 'csv',  label: 'CSV (.csv)',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${exportFormat === opt.value ? '#60a5fa60' : 'var(--border)'}`,
                        background: exportFormat === opt.value ? '#60a5fa0d' : 'transparent',
                        fontWeight: 600, fontSize: '0.85rem',
                        color: exportFormat === opt.value ? '#60a5fa' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="exportFormat"
                        value={opt.value}
                        checked={exportFormat === opt.value}
                        onChange={() => setExportFormat(opt.value)}
                        style={{ display: 'none' }}
                      />
                      {opt.icon}
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => exportStep === 'confirm' ? setExportStep('filter') : setShowExportModal(false)}>
                {exportStep === 'confirm' ? 'Retour' : 'Annuler'}
              </button>
              {exportStep === 'filter' ? (
                <button className="btn btn-primary" onClick={goToConfirm} disabled={exportSelectedGroups.size === 0}>
                  Suivant →
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Confirmer l'export {exportFormat.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
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
