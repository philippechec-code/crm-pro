import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import storage from '../services/storage';
import { leadsApi, statusesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusSelect from '../components/StatusSelect';
import Toast from '../components/Toast';

const ACTION_LABELS = {
  created:  'Création',
  updated:  'Modification',
  comment:  'Commentaire',
  assigned: 'Assignation',
  status_changed: 'Changement de statut',
};

export default function LeadDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead]         = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm]         = useState({});
  const [comment, setComment]   = useState('');
  const [dirty, setDirty]       = useState(false);

  function toast(msg, type='info'){
    window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
  }

  function reload(){
    // Chargé via useEffect async
    if (!l) { navigate('/leads'); return; }
    setLead(l);
    statusesApi.list().then(res => setStatuses(res.data || [])).catch(e => console.error(e));
    setForm({
      first_name: l.first_name || '',
      last_name:  l.last_name  || '',
      phone:      l.phone      || '',
      email:      l.email      || '',
      address:    l.address    || '',
      city:       l.city       || '',
      postal_code:l.postal_code|| '',
      status:     l.status     || 'nouveau',
      source:     l.source     || '',
    });
    setDirty(false);
  }

  useEffect(() => { reload(); }, [id]);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const save = () => {
    leadsApi.update(id, form).then(() => toast('Prospect mis à jour', 'success')).catch(e => toast('Erreur', 'error'));
    toast('Prospect mis à jour', 'success');
    reload();
  };

  const addComment = () => {
    if (!comment.trim()) return;
    leadsApi.addComment(id, comment.trim()).then(() => reload()).catch(e => toast('Erreur', 'error'));
    setComment('');
    toast('Commentaire ajouté', 'success');
    reload();
  };

  const deleteLead = () => {
    if (!confirm('Supprimer ce prospect définitivement ?')) return;
    leadsApi.delete(id).then(() => { toast('Supprimé', 'success'); navigate('/leads'); }).catch(e => toast('Erreur', 'error'));
    navigate('/leads');
  };

  if (!lead) return <div className="loading-page"><div className="spinner" /></div>;

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="page-scroll">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/leads')} title="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <div className="page-title">{fullName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <StatusBadge status={lead.status} />
              {lead.source && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>via {lead.source}</span>}
            </div>
          </div>
        </div>
        <div className="header-actions">
          {dirty && <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer</button>}
          <button
            className="btn btn-secondary btn-sm"
            title="Planifier un rappel"
            onClick={() => window.dispatchEvent(new CustomEvent('crm:open-scheduler', { detail: { lead } }))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Planifier un rappel
          </button>
          {user?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={deleteLead}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="lead-detail-grid">

        {/* Left: form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identité */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 700 }}>Identité</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input className="form-control" value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input className="form-control" value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input className="form-control" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 700 }}>Adresse</div>
            </div>
            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input className="form-control" value={form.address} onChange={e => handleChange('address', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Code postal</label>
                <input className="form-control" value={form.postal_code} onChange={e => handleChange('postal_code', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input className="form-control" value={form.city} onChange={e => handleChange('city', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Qualification */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 700 }}>Qualification</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Statut</label>
                <div style={{ marginTop: 6 }}>
                  <StatusSelect
                    value={form.status}
                    onChange={(newStatus) => {
                      setForm(f => ({ ...f, status: newStatus }));
                      leadsApi.update(id, { status: newStatus }).then(() => reload()).catch(e => toast('Erreur', 'error'));
                      toast('Statut mis à jour', 'success');
                      reload();
                      if (newStatus === 'rappel') {
                        window.dispatchEvent(new CustomEvent('crm:open-scheduler', { detail: { lead } }));
                      }
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <input className="form-control" value={form.source} onChange={e => handleChange('source', e.target.value)} />
              </div>
            </div>
            {dirty && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={save}>Enregistrer les modifications</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: comments + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Add comment */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 700 }}>Ajouter un commentaire</div>
            </div>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Votre commentaire…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') addComment(); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={addComment} disabled={!comment.trim()}>
                Ajouter
              </button>
            </div>
          </div>

          {/* History */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 700 }}>Historique</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(lead.history || []).length} entrée{(lead.history || []).length !== 1 ? 's' : ''}</span>
            </div>

            {(!lead.history || lead.history.length === 0) && (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>Aucun historique</p>
              </div>
            )}

            <div className="history-list">
              {(lead.history || []).map(h => (
                <div key={h.id} className="history-item">
                  <div className="history-icon">
                    {h.action === 'comment'  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                    {h.action === 'created'  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                    {h.action === 'updated'  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                    {h.action === 'assigned' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                  </div>
                  <div className="history-content">
                    <div className="history-action">{ACTION_LABELS[h.action] || h.action}</div>
                    {h.note && <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>{h.note}</div>}
                    <div className="history-meta">
                      {new Date(h.created_at).toLocaleString('fr-FR')}
                      {h.user_name && <> · <span style={{ color: 'var(--accent)' }}>{h.user_name}</span></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast />
    </div>
  );
}
