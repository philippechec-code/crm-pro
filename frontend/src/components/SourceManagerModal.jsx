import { useState, useEffect } from 'react';
import { sourcesApi } from '../services/api';

export default function SourceManagerModal({ onClose, onReload }) {
  const [sources, setSources] = useState([]);
  const [newSource, setNewSource] = useState({ label: '', color: '#60a5fa' });
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(true);

  function toast(msg, type = 'info') {
    window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
  }

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const res = await sourcesApi.list();
      setSources(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSource.label.trim()) {
      toast('Nom requis', 'error');
      return;
    }
    try {
      await sourcesApi.create(newSource);
      toast('Source créée', 'success');
      setNewSource({ label: '', color: '#60a5fa' });
      loadSources();
      if (onReload) onReload();
    } catch (e) {
      toast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleUpdate = async (id) => {
    if (!editLabel.trim()) return;
    try {
      await sourcesApi.update(id, { label: editLabel, color: editColor });
      toast('Source modifiée', 'success');
      setEditId(null);
      loadSources();
      if (onReload) onReload();
    } catch (e) {
      toast('Erreur', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette source ?')) return;
    try {
      await sourcesApi.delete(id);
      toast('Source supprimée', 'success');
      loadSources();
      if (onReload) onReload();
    } catch (e) {
      toast('Erreur', 'error');
    }
  };

  const startEdit = (source) => {
    setEditId(source.id);
    setEditLabel(source.label);
    setEditColor(source.color);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Gérer les sources</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '16px 20px' }}>
          {/* Formulaire ajout */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              className="form-control"
              placeholder="Nouvelle source..."
              value={newSource.label}
              onChange={e => setNewSource({ ...newSource, label: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{ flex: 1 }}
            />
            <input
              type="color"
              value={newSource.color}
              onChange={e => setNewSource({ ...newSource, color: e.target.value })}
              style={{ width: 44, height: 40, padding: 2, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
            />
            <button className="btn btn-primary" onClick={handleAdd}>Ajouter</button>
          </div>

          {/* Liste des sources */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chargement...</div>
          ) : sources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Aucune source</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.map(source => (
                <div key={source.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 10, border: '1px solid var(--border)'
                }}>
                  {editId === source.id ? (
                    <>
                      <input
                        type="color"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        style={{ width: 32, height: 32, padding: 2, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
                      />
                      <input
                        className="form-control"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(source.id)}
                        style={{ flex: 1, height: 36 }}
                        autoFocus
                      />
                      <button className="btn btn-ghost btn-sm" onClick={() => handleUpdate(source.id)} style={{ color: '#30d158' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)} style={{ color: 'var(--text-muted)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: source.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 500 }}>{source.label}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(source)} title="Modifier">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(source.id)} title="Supprimer" style={{ color: '#ff453a' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
