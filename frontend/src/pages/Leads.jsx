import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import storage from '../services/storage';
import { leadsApi, groupsApi, usersApi, statusesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusSelect from '../components/StatusSelect';
import AgentSelect from '../components/AgentSelect';
import Toast from '../components/Toast';

const EMPTY_FORM = { first_name: '', last_name: '', phone: '', email: '', status: 'nouveau', source: '', comment: '' };

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [search, setSearch]               = useState('');
  const [filterStatuses, setFilterStatuses] = useState(new Set());
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const statusDropRef = useRef(null);
  const [filterAgent, setFilterAgent]     = useState('');
  const [filterSource, setFilterSource]   = useState('');

  // Modals
  const [showCreate, setShowCreate]     = useState(false);
  const [createForm, setCreateForm]     = useState(EMPTY_FORM);
  const [showStatuses, setShowStatuses] = useState(false);
  const [newStatus, setNewStatus]       = useState({ label: '', color: '#60a5fa' });

  // Selection (admin)
  const [selected, setSelected] = useState(new Set());
  const [perPage, setPerPage] = useState(100);
  const [groups, setGroups] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Inline comment popover
  const [commentingId, setCommentingId]   = useState(null);
  const [commentText, setCommentText]     = useState('');
  const [commentPos, setCommentPos]       = useState({ top: 0, left: 0 });
  const commentPanelRef = useRef(null);

  const closeComment = useCallback(() => { setCommentingId(null); setCommentText(''); }, []);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropOpen) return;
    const handler = (e) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target)) setStatusDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusDropOpen]);

  const toggleFilterStatus = (id) => {
    const s = new Set(filterStatuses);
    s.has(id) ? s.delete(id) : s.add(id);
    setFilterStatuses(s);
  };

  const openComment = (e, leadId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCommentPos({ top: rect.bottom + 6, left: Math.max(8, rect.right - 300) });
    setCommentingId(leadId);
    const lead = leads.find(l => l.id === leadId);
    setCommentText(lead?.comment || '');
  };

  useEffect(() => {
    if (!commentingId) return;
    const handleOutside = (e) => {
      if (commentPanelRef.current && !commentPanelRef.current.contains(e.target)) closeComment();
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handleOutside), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handleOutside); };
  }, [commentingId, closeComment]);

  const submitComment = () => {
    if (!commentText.trim()) return;
    leadsApi.addComment(commentingId, commentText.trim()).then(() => { reload(); toast("Commentaire ajouté", "success"); }).catch(e => toast("Erreur", "error"));
    toast('Commentaire ajouté', 'success');
    closeComment();
    reload();
  };

  function toast(msg, type='info'){
    window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
  }

  function reload(){
    leadsApi.list().then(res => setLeads(res.data?.leads || [])).catch(e => console.error(e));
    usersApi.list().then(res => setUsers(res.data || [])).catch(() => setUsers([]));
    groupsApi.list().then(res => setGroups(res.data || [])).catch(() => setGroups([]));
    statusesApi.list().then(res => setStatuses(res.data || [])).catch(e => console.error(e));
  }

  useEffect(() => {
    reload();
    setLoading(false);
  }, []);

  // Leads visible pour cet utilisateur (base des stats)
  const myLeads = useMemo(() =>
    user?.role === 'admin' ? leads : leads.filter(l => l.assigned_to === user?.id),
  [leads, user]);

  // KPI stats
  const stats = useMemo(() => {
    const byStatus = {};
    (statuses || []).forEach(s => { byStatus[s.id] = 0; });
    (myLeads || []).forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    const week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return {
      total: myLeads.length,
      newThisWeek: myLeads.filter(l => new Date(l.created_at) >= week).length,
      byStatus,
    };
  }, [myLeads, statuses]);

  // Unique sources for filter dropdown
  const sources = useMemo(() => {
    const s = new Set(leads.map(l => l.source).filter(Boolean));
    return [...s].sort();
  }, [leads]);

  // Filtered leads — agents only see their assigned leads
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      if (user?.role !== 'admin' && l.assigned_to !== user?.id) return false;
      if (filterStatuses.size > 0 && !filterStatuses.has(l.status)) return false;
      if (filterAgent && l.assigned_to !== filterAgent) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (q) {
        const full = `${l.first_name} ${l.last_name} ${l.phone} ${l.email} ${l.source}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, filterStatuses, filterAgent, filterSource, user]);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, currentPage, perPage]);

  // Selection helpers
  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(paginatedLeads.map(l => l.id)));
  };

  // Delete
  const handleDelete = (id) => {
    if (!confirm('Supprimer ce prospect définitivement ?')) return;
    leadsApi.delete(id).then(() => reload()).catch(e => toast("Erreur suppression", "error"));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    toast('Prospect supprimé', 'success');
    reload();
  };

  const handleBulkDelete = () => {
    const n = selected.size;
    if (!confirm(`Supprimer ${n} prospect${n > 1 ? 's' : ''} définitivement ? Cette action est irréversible.`)) return;
    leadsApi.deleteMultiple([...selected]).then(() => { reload(); setSelected(new Set()); toast('Prospects supprimés', 'success'); }).catch(e => toast('Erreur suppression', 'error')); return;
    setSelected(new Set());
    toast(`${n} prospect${n > 1 ? 's' : ''} supprimé${n > 1 ? 's' : ''}`, 'success');
    reload();
  };

  // Bulk assign
  const bulkChangeGroup = (groupId) => {
    if (selected.size === 0) { toast('Aucun prospect sélectionné', 'error'); return; }
    const ids = [...selected];
    Promise.all(ids.map(id => leadsApi.update(id, { group_id: groupId }))).then(() => {
      reload();
      setSelected(new Set());
      toast('Groupe mis à jour', 'success');
    }).catch(e => toast('Erreur', 'error'));
  };
  const bulkAssign = (userId) => {
    if (selected.size === 0) { toast('Aucun prospect sélectionné', 'error'); return; }
    const ids = [...selected];
    if (userId === 'auto') {
      const agents = users.filter(u => u.role !== 'admin').map(u => u.id);
      Promise.all(ids.map((id, i) => leadsApi.update(id, { assigned_to: agents[i % agents.length] }))).then(() => reload()).catch(e => toast('Erreur', 'error'));
      toast('Répartition automatique effectuée', 'success');
    } else {
      Promise.all(ids.map(id => leadsApi.update(id, { assigned_to: userId || null }))).then(() => reload()).catch(e => toast('Erreur', 'error'));
      toast('Assignation groupée effectuée', 'success');
    }
    reload();
    setSelected(new Set());
  };

  // Create lead
  const handleCreate = () => {
    if (!createForm.first_name && !createForm.last_name) {
      toast('Nom requis', 'error'); return;
    }
    leadsApi.create(createForm).then(() => { reload(); toast("Prospect créé", "success"); }).catch(e => toast("Erreur création", "error"));
    toast('Prospect créé', 'success');
    setCreateForm(EMPTY_FORM);
    setShowCreate(false);
    reload();
  };

  // Status management
  const handleAddStatus = () => {
    if (!newStatus.label.trim()) { toast('Nom du statut requis', 'error'); return; }
    toast('Les statuts sont prédéfinis et ne peuvent pas être modifiés', 'info'); const res = null;
    if (!res) { toast('Ce statut existe déjà', 'error'); return; }
    toast('Statut créé', 'success');
    setNewStatus({ label: '', color: '#60a5fa' });
    statusesApi.list().then(res => setStatuses(res.data || [])).catch(e => console.error(e));
  };
  const handleDeleteStatus = (id) => {
    toast('Les statuts sont prédéfinis et ne peuvent pas être supprimés', 'info'); const ok = false;
    if (!ok) { toast('Erreur lors de la suppression', 'error'); return; }
    toast('Statut supprimé', 'success');
    statusesApi.list().then(res => setStatuses(res.data || [])).catch(e => console.error(e));
  };

  const getUserName = (id) => {
    if (!id) return '—';
    const u = users.find(x => x.id === id);
    return u?.full_name || u?.email || '—';
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-top">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Prospects</div>
          <div className="page-subtitle">
            {user?.role === 'admin'
              ? `${leads.length} prospect${leads.length !== 1 ? 's' : ''} au total`
              : `${filtered.length} prospect${filtered.length !== 1 ? 's' : ''} assigné${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="header-actions">
          {user?.role === 'admin' && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowStatuses(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              Gérer les statuts
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouveau prospect
          </button>
        </div>
      </div>

      {/* ── KPI stats ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
        <LeadStatCard label="Total" value={stats.total} color="var(--accent)" icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        } />
        <LeadStatCard label="Nouveaux (7j)" value={stats.newThisWeek} color="var(--success)" icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        } />
        {statuses.map(s => (
          <LeadStatCard key={s.id} label={s.label} value={stats.byStatus[s.id] || 0} color={s.color} />
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="filters-bar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="search-input"
            placeholder="Rechercher nom, téléphone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Multi-select statuts */}
        <div ref={statusDropRef} style={{ position: 'relative' }}>
          <button
            className="filter-select"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 160, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 36, fontSize: '0.85rem', color: filterStatuses.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
            onClick={() => setStatusDropOpen(o => !o)}
          >
            {filterStatuses.size === 0
              ? 'Tous les statuts'
              : filterStatuses.size === 1
                ? statuses.find(s => filterStatuses.has(s.id))?.label
                : `${filterStatuses.size} statuts`
            }
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {statusDropOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 1000,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '6px 0', minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {statuses.map(s => (
                <label key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 14px', cursor: 'pointer',
                  background: filterStatuses.has(s.id) ? 'rgba(255,255,255,0.05)' : 'transparent',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = filterStatuses.has(s.id) ? 'rgba(255,255,255,0.05)' : 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={filterStatuses.has(s.id)}
                    onChange={() => toggleFilterStatus(s.id)}
                    style={{ accentColor: s.color, width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s.label}</span>
                </label>
              ))}
              {filterStatuses.size > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 0' }}>
                  <button
                    style={{ width: '100%', padding: '7px 14px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => { setFilterStatuses(new Set()); setStatusDropOpen(false); }}
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {user?.role === 'admin' && (
          <select className="filter-select" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="">Tous les agents</option>
            <option value="__none__">Non assigné</option>
            {users.filter(u => u.role !== 'admin').map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        )}

        {sources.length > 0 && (
          <select className="filter-select" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="">Toutes les sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {(search || filterStatuses.size > 0 || filterAgent || filterSource) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatuses(new Set()); setFilterAgent(''); setFilterSource(''); }}>
            Réinitialiser
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="filter-select" style={{ padding: "4px 8px", fontSize: "0.8rem" }}>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={150}>150 / page</option>
            <option value={200}>200 / page</option>
            <option value={500}>500 / page</option>
          </select>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      </div>{/* end page-top */}

        {/* Bulk action bar - sticky top */}
        {user?.role === 'admin' && selected.size > 0 && (
          <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: 4 }}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            <select className="filter-select" defaultValue="" onChange={e => { if(e.target.value) bulkAssign(e.target.value); e.target.value=''}}>
              <option value="" disabled>Assigner à…</option>
              <option value="auto">Répartition automatique</option>
              {users.filter(u => u.role !== 'admin').map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
            <select className="filter-select" defaultValue="" onChange={e => { if(e.target.value) bulkChangeGroup(e.target.value); e.target.value='';}}>
              <option value="" disabled>Déplacer vers groupe…</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Supprimer ({selected.size})
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Annuler</button>
          </div>
        )}
      {/* ── Table (zone scrollable) ──────────────────────────── */}
      <div className="page-scroll">
      <div className="card" style={{ padding: 0 }}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {user?.role === 'admin' && (
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                )}
                <th>Nom</th>
                <th>Téléphone</th>
                <th className="col-email">Email</th>
                <th>Statut</th>
                <th className="col-source">Source</th>
                <th className="col-agent">Assigné à</th>
                <th className="col-date">Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 8 : 7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Aucun prospect trouvé
                  </td>
                </tr>
              )}
              {paginatedLeads.map(l => (
                <tr key={l.id} style={{ cursor: 'pointer' }}>
                  {user?.role === 'admin' && (
                    <td onClick={e => { e.stopPropagation(); toggleSelect(l.id); }}>
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                    </td>
                  )}
                  <td>
                    <Link to={`/leads/${l.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                    </Link>
                    {l.city && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.city}</div>}
                  </td>
                  <td>{l.phone || '—'}</td>
                  <td className="td-muted col-email">{l.email || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <StatusSelect
                      value={l.status}
                      onChange={(newStatus) => {
                        leadsApi.update(l.id, { status: newStatus }).then(() => reload()).catch(e => toast("Erreur", "error"));
                        reload();
                        toast(`Statut mis à jour`, 'success');
                        if (newStatus === 'rappel') window.dispatchEvent(new CustomEvent('crm:open-scheduler', { detail: { lead: l } }));
                      }}
                    />
                  </td>
                  <td className="td-muted col-source">
                    {l.source
                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:100, fontSize:'0.72rem', fontWeight:600, background:'rgba(255,255,255,0.06)', color:'var(--text-secondary)' }}>{l.source}</span>
                      : <span style={{ color:'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td className="col-agent" onClick={e => e.stopPropagation()}>
                    {user?.role === 'admin' ? (
                      <AgentSelect
                        value={l.assigned_to}
                        onChange={(agentId) => {
                          leadsApi.update(l.id, { assigned_to: agentId }).then(() => reload()).catch(e => toast("Erreur", "error"));
                          reload();
                          toast('Agent mis à jour', 'success');
                        }}
                      />
                    ) : (
                      <span className="td-muted">{getUserName(l.assigned_to)}</span>
                    )}
                  </td>
                  <td className="td-muted col-date">{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      title={l.comment ? `Commentaire : ${l.comment}` : 'Ajouter un commentaire'}
                      onClick={e => openComment(e, l.id)}
                      style={{ position: 'relative', color: commentingId === l.id ? 'var(--accent)' : l.comment ? 'var(--text-secondary)' : undefined }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {l.comment && (
                        <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                      )}
                    </button>
                    <Link to={`/leads/${l.id}`} className="btn btn-ghost btn-icon" title="Voir le détail">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    {user?.role === 'admin' && (
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Supprimer"
                        onClick={e => { e.stopPropagation(); handleDelete(l.id); }}
                        style={{ color: '#fb7185' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>««</button>
            <button className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>«</button>
            <span style={{ padding: "0 12px", fontSize: "0.85rem" }}>Page {currentPage} / {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>»</button>
            <button className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»»</button>
          </div>
        )}
      </div>
      </div>{/* end page-scroll */}

      {/* ── Modal: Nouveau prospect ──────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Nouveau prospect</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prénom</label>
                  <input className="form-control" value={createForm.first_name} onChange={e => setCreateForm({...createForm, first_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-control" value={createForm.last_name} onChange={e => setCreateForm({...createForm, last_name: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-control" value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select className="form-control" value={createForm.status} onChange={e => setCreateForm({...createForm, status: e.target.value})}>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <input className="form-control" placeholder="Site web, téléphone…" value={createForm.source} onChange={e => setCreateForm({...createForm, source: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire</label>
                <textarea className="form-control" rows={2} value={createForm.comment} onChange={e => setCreateForm({...createForm, comment: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCreate}>Créer le prospect</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gérer les statuts ─────────────────────────── */}
      {showStatuses && (
        <StatusManagerModal
          statuses={statuses}
          onClose={() => setShowStatuses(false)}
          onAdd={handleAddStatus}
          onDelete={handleDeleteStatus}
          onUpdate={(id, patch) => { statusesApi.update(id, patch).then(() => statusesApi.list().then(res => setStatuses(res.data || []))).catch(e => console.error(e)); }}
          newStatus={newStatus}
          setNewStatus={setNewStatus}
        />
      )}

      {/* ── Floating comment panel ──────────────────────────── */}
      {commentingId && (
        <div
          ref={commentPanelRef}
          style={{
            position: 'fixed',
            top: commentPos.top,
            left: commentPos.left,
            zIndex: 9999,
            background: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 12,
            width: 300,
            boxShadow: '0 20px 60px rgba(0,0,0,0.75)',
            animation: 'fadeSlideDown 0.14s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Ajouter un commentaire
          </div>
          <textarea
            autoFocus
            rows={3}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') submitComment(); if (e.key === 'Escape') closeComment(); }}
            placeholder="Votre commentaire… (Ctrl+Entrée pour valider)"
            style={{
              width: '100%', padding: '8px 10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: '#fff',
              fontSize: '0.85rem', resize: 'none',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={closeComment}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={!commentText.trim()}>Ajouter</button>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}

export function StatusManagerModal({ statuses, onClose, onAdd, onDelete, onUpdate, newStatus, setNewStatus }) {
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

  const startEdit = (s) => { setEditId(s.id); setEditLabel(s.label); setEditColor(s.color); };
  const commitEdit = () => {
    if (!editLabel.trim()) return;
    onUpdate(editId, { label: editLabel.trim(), color: editColor });
    setEditId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Gérer les statuts</div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {statuses.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                {editId === s.id ? (
                  <>
                    <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                      style={{ width: 32, height: 32, padding: 2, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--border)', cursor: 'pointer', flexShrink: 0 }} />
                    <input
                      className="form-control"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditId(null); }}
                      autoFocus
                      style={{ flex: 1, padding: '5px 8px', fontSize: '0.875rem' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={commitEdit}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{s.label}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(s)} title="Modifier">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(s.id)} title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AJOUTER UN STATUT</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Nom</label>
              <input className="form-control" placeholder="Ex: Qualifié" value={newStatus.label} onChange={e => setNewStatus({ ...newStatus, label: e.target.value })} onKeyDown={e => e.key === 'Enter' && onAdd()} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Couleur</label>
              <input type="color" value={newStatus.color} onChange={e => setNewStatus({ ...newStatus, color: e.target.value })}
                style={{ width: 42, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--border)', cursor: 'pointer' }} />
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginBottom: 1 }} onClick={onAdd}>Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadStatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {icon && <span style={{ color, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
