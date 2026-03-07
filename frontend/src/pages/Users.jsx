import { useEffect, useState } from 'react';
import storage from '../services/storage';
import { useAuth } from '../contexts/AuthContext';

function toast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
}

const EMPTY_FORM = { email: '', password: '', role: 'agent', full_name: '' };
const EMPTY_PWD  = { newPassword: '', confirm: '', show: false };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [showCreate, setShowCreate] = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

  // État du modal changement de mot de passe
  const [pwdTarget, setPwdTarget]   = useState(null);   // user object
  const [pwdForm, setPwdForm]       = useState(EMPTY_PWD);

  function reload() { setUsers(storage.getUsers()); }
  useEffect(() => { reload(); }, []);

  const getLeadCount = id => storage.getLeads().filter(l => l.assigned_to === id).length;

  // ── Création d'un utilisateur ──────────────────────────────────────────────
  const handleCreate = () => {
    if (!form.full_name.trim()) { toast('Nom requis', 'error'); return; }
    if (!form.email.trim())     { toast('Email requis', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast('Email invalide', 'error'); return; }
    if (form.password.length < 8) { toast('Mot de passe : 8 caractères minimum', 'error'); return; }
    if (storage.findUserByEmail(form.email)) { toast('Cet email est déjà utilisé', 'error'); return; }
    storage.createUser(form);
    toast('Utilisateur créé', 'success');
    setForm(EMPTY_FORM);
    setShowCreate(false);
    reload();
  };

  // ── Changement de mot de passe ─────────────────────────────────────────────
  const openPwdModal = (u) => {
    setPwdTarget(u);
    setPwdForm(EMPTY_PWD);
  };
  const closePwdModal = () => {
    setPwdTarget(null);
    setPwdForm(EMPTY_PWD);
  };
  const handleChangePwd = () => {
    if (pwdForm.newPassword.length < 8) {
      toast('Le mot de passe doit contenir au moins 8 caractères', 'error'); return;
    }
    if (pwdForm.newPassword !== pwdForm.confirm) {
      toast('Les mots de passe ne correspondent pas', 'error'); return;
    }
    // use dedicated change to record audit
    storage.changeUserPassword(pwdTarget.id, pwdForm.newPassword, me?.id);
    toast(`Mot de passe de ${pwdTarget.full_name || pwdTarget.email} mis à jour`, 'success');
    closePwdModal();
    reload();
  };

  // ── Activation / désactivation ─────────────────────────────────────────────
  const toggleActive = (u) => {
    if (u.id === me?.id) { toast('Vous ne pouvez pas vous désactiver', 'error'); return; }
    storage.updateUser(u.id, { active: !u.active });
    toast(u.active !== false ? 'Utilisateur désactivé' : 'Utilisateur activé', 'info');
    reload();
  };

  const handleDelete = (u) => {
    if (u.id === me?.id) { toast('Vous ne pouvez pas vous supprimer', 'error'); return; }
    if (!window.confirm(`Supprimer ${u.full_name || u.email} ?`)) return;
    storage.deleteUser(u.id);
    toast('Utilisateur supprimé', 'success');
    reload();
  };

  const roleColor = r => r === 'admin' ? 'var(--accent)' : 'var(--success)';
  const roleLabel = r => r === 'admin' ? 'Administrateur' : 'Agent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-top">
        <div className="page-header">
          <div>
            <div className="page-title">Utilisateurs</div>
            <div className="page-subtitle">{users.length} compte{users.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouvel utilisateur
            </button>
          </div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="card" style={{ padding: 0 }}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Prospects assignés</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe  = u.id === me?.id;
                  const count = getLeadCount(u.id);
                  return (
                    <tr key={u.id} style={{ opacity: u.active === false ? 0.5 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: roleColor(u.role) + '1a', color: roleColor(u.role),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 700,
                          }}>
                            {(u.full_name || u.email).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>
                              {u.full_name || '—'}
                              {isMe && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500 }}>(vous)</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="td-muted">{u.email}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 100,
                          fontSize: '0.72rem', fontWeight: 600,
                          background: roleColor(u.role) + '1a', color: roleColor(u.role),
                        }}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="td-muted">{count}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 100,
                          fontSize: '0.72rem', fontWeight: 600,
                          background: u.active !== false ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.1)',
                          color: u.active !== false ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {u.active !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Changer le mot de passe */}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Changer le mot de passe"
                            onClick={() => openPwdModal(u)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </button>
                          {/* Activer / désactiver */}
                          <button className="btn btn-ghost btn-icon btn-sm"
                            title={u.active !== false ? 'Désactiver' : 'Activer'}
                            onClick={() => toggleActive(u)} disabled={isMe}>
                            {u.active !== false
                              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
                            }
                          </button>
                          {/* Supprimer */}
                          <button className="btn btn-danger btn-icon btn-sm" title="Supprimer"
                            onClick={() => handleDelete(u)} disabled={isMe}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal: Nouvel utilisateur ──────────────────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Nouvel utilisateur</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input className="form-control" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Prénom Nom" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@domaine.fr" />
              </div>
              <div className="form-group">
                <label className="form-label">Mot de passe * (8 caractères min.)</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-control" type={showPwd ? 'text' : 'password'}
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 caractères" style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      {showPwd
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Rôle</label>
                <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="agent">Agent</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCreate}>{"Créer l'utilisateur"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Changer le mot de passe ────────────────────────────────── */}
      {pwdTarget && (
        <div className="modal-overlay" onClick={closePwdModal}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Changer le mot de passe</div>
              <button className="modal-close" onClick={closePwdModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {(pwdTarget.full_name || pwdTarget.email).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{pwdTarget.full_name || pwdTarget.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pwdTarget.email}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nouveau mot de passe *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    type={pwdForm.show ? 'text' : 'password'}
                    value={pwdForm.newPassword}
                    onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Minimum 8 caractères"
                    autoFocus
                    style={{ paddingRight: 42 }}
                    onKeyDown={e => e.key === 'Enter' && handleChangePwd()}
                  />
                  <button type="button" onClick={() => setPwdForm(f => ({ ...f, show: !f.show }))} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      {pwdForm.show
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
                {pwdForm.newPassword.length > 0 && pwdForm.newPassword.length < 8 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 5 }}>
                    Au moins 8 caractères requis
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirmer le mot de passe *</label>
                <input
                  className="form-control"
                  type={pwdForm.show ? 'text' : 'password'}
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Répéter le mot de passe"
                  onKeyDown={e => e.key === 'Enter' && handleChangePwd()}
                />
                {pwdForm.confirm.length > 0 && pwdForm.newPassword !== pwdForm.confirm && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 5 }}>
                    Les mots de passe ne correspondent pas
                  </div>
                )}
                {pwdForm.confirm.length > 0 && pwdForm.newPassword === pwdForm.confirm && pwdForm.newPassword.length >= 8 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 5 }}>
                    ✓ Les mots de passe correspondent
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closePwdModal}>Annuler</button>
              <button
                className="btn btn-primary"
                onClick={handleChangePwd}
                disabled={pwdForm.newPassword.length < 8 || pwdForm.newPassword !== pwdForm.confirm}
              >
                Enregistrer le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
