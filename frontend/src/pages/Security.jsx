import React, { useState, useEffect, useCallback } from 'react';
import { securityApi } from '../services/api';

// ── Error Boundary ─────────────────────────────────────────────────────────────
// Empêche la page noire en cas d'erreur JS silencieuse en production

class SecurityErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || 'Erreur inconnue' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="page-top">
            <div className="page-header">
              <div>
                <div className="page-title">Sécurité</div>
                <div className="page-subtitle">Une erreur est survenue</div>
              </div>
            </div>
          </div>
          <div className="page-scroll">
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 600 }}>
                Impossible d'afficher la page Sécurité
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                {this.state.errorMsg}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => window.location.reload()}
              >
                Recharger la page
              </button>
            </div>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
}

const EVENT_CONFIG = {
  login_success:    { label: 'Connexion réussie',      color: '#30d158' },
  login_failed:     { label: 'Échec de connexion',     color: '#ff453a' },
  ip_blocked:       { label: 'IP bloquée',             color: '#ff9f0a' },
  lead_deleted:     { label: 'Lead supprimé',          color: '#ff453a' },
  user_modified:    { label: 'Utilisateur modifié',    color: '#0a84ff' },
  user_deactivated: { label: 'Utilisateur désactivé',  color: '#ff9f0a' },
};

const LOG_LIMIT = 50;

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return String(iso);
  }
}

function fmtDetails(details) {
  if (details === null || details === undefined) return '—';
  try {
    const obj = typeof details === 'string' ? JSON.parse(details) : details;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return String(details);
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v ?? '')}`)
      .join(' · ');
  } catch {
    return String(details);
  }
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcoPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
  </svg>
);
const IcoWifi = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
  </svg>
);
const IcoRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const IcoMinus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const IcoClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Composant principal ───────────────────────────────────────────────────────

function SecurityInner() {

  // ── IP Whitelist ──────────────────────────────────────────────────────────
  const [ips, setIps]               = useState([]);
  const [myIP, setMyIP]             = useState(null);
  const [ipsLoading, setIpsLoading] = useState(true);
  const [showAddIP, setShowAddIP]   = useState(false);
  const [ipForm, setIpForm]         = useState({ ip: '', description: '' });
  const [ipSaving, setIpSaving]     = useState(false);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const [logs, setLogs]               = useState([]);
  const [logsTotal, setLogsTotal]     = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logOffset, setLogOffset]     = useState(0);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterUser, setFilterUser]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadIPs = useCallback(async () => {
    setIpsLoading(true);
    try {
      const { data } = await securityApi.getIPs();
      setIps(Array.isArray(data) ? data : []);
    } catch {
      toast('Impossible de charger la whitelist', 'error');
      setIps([]);
    } finally {
      setIpsLoading(false);
    }
  }, []);

  const loadMyIP = useCallback(async () => {
    try {
      const { data } = await securityApi.getMyIP();
      setMyIP(data && data.ip ? String(data.ip) : null);
    } catch { /* silencieux */ }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data } = await securityApi.getLogs({
        ...(filterEvent && { event_type: filterEvent }),
        ...(filterUser  && { username: filterUser }),
        ...(dateFrom    && { date_from: dateFrom }),
        ...(dateTo      && { date_to: dateTo }),
        limit: LOG_LIMIT,
        offset: logOffset,
      });
      setLogs(Array.isArray(data && data.logs) ? data.logs : []);
      setLogsTotal(typeof (data && data.total) === 'number' ? data.total : 0);
    } catch {
      toast('Impossible de charger les logs', 'error');
      setLogs([]);
      setLogsTotal(0);
    } finally {
      setLogsLoading(false);
    }
  }, [filterEvent, filterUser, dateFrom, dateTo, logOffset]);

  useEffect(() => { loadIPs(); loadMyIP(); }, [loadIPs, loadMyIP]);
  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { setLogOffset(0); }, [filterEvent, filterUser, dateFrom, dateTo]);

  // ── Handlers IP ───────────────────────────────────────────────────────────

  const handleAddIP = async () => {
    if (!ipForm.ip.trim()) { toast('Adresse IP requise', 'error'); return; }
    setIpSaving(true);
    try {
      await securityApi.addIP(ipForm);
      toast('IP ajoutée à la whitelist', 'success');
      setShowAddIP(false);
      setIpForm({ ip: '', description: '' });
      loadIPs();
    } catch (e) {
      toast((e && e.response && e.response.data && e.response.data.error) || 'Erreur lors de l\'ajout', 'error');
    } finally {
      setIpSaving(false);
    }
  };

  const handleDeleteIP = async (id, ip) => {
    if (!window.confirm(`Supprimer l'IP ${ip} de la whitelist ?`)) return;
    try {
      await securityApi.deleteIP(id);
      toast('IP supprimée', 'success');
      loadIPs();
    } catch {
      toast('Erreur lors de la suppression', 'error');
    }
  };

  const handleToggleIP = async (entry) => {
    try {
      await securityApi.updateIP(entry.id, { actif: !entry.actif });
      loadIPs();
    } catch {
      toast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleToggleAll = async (target) => {
    try {
      await Promise.all(ips.map(ip => securityApi.updateIP(ip.id, { actif: target })));
      toast(target ? 'Whitelist activée' : 'Whitelist désactivée', 'success');
      loadIPs();
    } catch {
      toast('Erreur lors de la mise à jour globale', 'error');
    }
  };

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const activeIPs     = ips.filter(e => e.actif);
  const allActive     = ips.length > 0 && ips.every(e => e.actif);
  const whitelistOn   = activeIPs.length > 0;
  const myIPInList    = myIP != null && ips.some(e => e.ip === myIP);
  const hasLogFilters = !!(filterEvent || filterUser || dateFrom || dateTo);
  const totalDisplay  = typeof logsTotal === 'number' ? logsTotal : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Header page ────────────────────────────────────────────────── */}
      <div className="page-top">
        <div className="page-header">
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IcoShield /> Sécurité
            </div>
            <div className="page-subtitle">Whitelist IP · Logs de connexion</div>
          </div>
        </div>
      </div>

      <div className="page-scroll">

        {/* ══ SECTION 1 : Whitelist IP ══════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 20, padding: 0 }}>

          {/* En-tête de la carte */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Whitelist IP</span>
                <span style={{
                  padding: '2px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700,
                  background: whitelistOn ? 'rgba(255,69,58,0.15)' : 'rgba(48,209,88,0.12)',
                  color: whitelistOn ? '#ff453a' : '#30d158',
                }}>
                  {whitelistOn
                    ? `${activeIPs.length} IP${activeIPs.length > 1 ? 's' : ''} active${activeIPs.length > 1 ? 's' : ''} — accès restreint`
                    : 'Désactivée — accès ouvert à tous'}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3 }}>
                {whitelistOn
                  ? 'Seules les adresses listées et actives peuvent joindre le backend.'
                  : 'Aucune IP active dans la liste — le backend accepte toutes les connexions.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {ips.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleToggleAll(!allActive)}
                  title={allActive ? 'Désactiver toutes les IPs' : 'Activer toutes les IPs'}
                >
                  {allActive ? 'Tout désactiver' : 'Tout activer'}
                </button>
              )}
              {myIP && !myIPInList && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => { setIpForm({ ip: myIP, description: 'Mon adresse IP' }); setShowAddIP(true); }}
                  title={`Ajouter votre IP actuelle (${myIP}) à la whitelist`}
                >
                  <IcoWifi /> &nbsp;Mon IP ({myIP})
                </button>
              )}
              {myIP && myIPInList && (
                <span style={{ fontSize: '0.78rem', color: '#30d158', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IcoWifi /> Mon IP ({myIP}) est dans la liste
                </span>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddIP(true)}>
                <IcoPlus /> &nbsp;Ajouter une IP
              </button>
            </div>
          </div>

          {/* Tableau des IPs */}
          {ipsLoading ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chargement…
            </div>
          ) : ips.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 12 }}>
                Aucune IP configurée. La whitelist est désactivée — tout le monde peut accéder au backend.
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddIP(true)}>
                <IcoPlus /> &nbsp;Ajouter la première IP
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Adresse IP / Plage CIDR</th>
                    <th>Description</th>
                    <th>Ajoutée par</th>
                    <th>Date d'ajout</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ips.map(entry => (
                    <tr key={entry.id} style={{ opacity: entry.actif ? 1 : 0.45 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{
                            background: 'rgba(255,255,255,0.07)',
                            padding: '3px 9px', borderRadius: 6,
                            fontSize: '0.83rem',
                            color: entry.actif ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                            {entry.ip}
                          </code>
                          {myIP === entry.ip && (
                            <span style={{
                              fontSize: '0.68rem', color: '#30d158', fontWeight: 600,
                              background: 'rgba(48,209,88,0.12)', padding: '1px 6px', borderRadius: 4,
                            }}>
                              mon IP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="td-muted">{entry.description || '—'}</td>
                      <td className="td-muted">{entry.created_by_name || '—'}</td>
                      <td className="td-muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(entry.created_at)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 100,
                          fontSize: '0.72rem', fontWeight: 600,
                          background: entry.actif ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.06)',
                          color: entry.actif ? '#30d158' : 'var(--text-muted)',
                        }}>
                          {entry.actif ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title={entry.actif ? 'Désactiver cette IP' : 'Activer cette IP'}
                            onClick={() => handleToggleIP(entry)}
                          >
                            {entry.actif ? <IcoMinus /> : <IcoClock />}
                          </button>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            title="Supprimer de la whitelist"
                            onClick={() => handleDeleteIP(entry.id, entry.ip)}
                          >
                            <IcoTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ══ SECTION 2 : Logs de connexion ════════════════════════════════ */}
        <div className="card" style={{ padding: 0 }}>

          {/* En-tête */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Logs de connexion</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                {totalDisplay.toLocaleString('fr-FR')} événement{totalDisplay !== 1 ? 's' : ''}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={loadLogs} disabled={logsLoading}>
              <IcoRefresh /> &nbsp;Actualiser
            </button>
          </div>

          {/* Filtres */}
          <div style={{
            display: 'flex', gap: 8, padding: '10px 16px',
            borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center',
          }}>
            <select
              className="form-control"
              style={{ width: 210, fontSize: '0.82rem' }}
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value)}
            >
              <option value="">Tous les événements</option>
              {Object.entries(EVENT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <input
              className="form-control"
              style={{ width: 150, fontSize: '0.82rem' }}
              placeholder="Utilisateur…"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            />

            <input
              type="date"
              className="form-control"
              style={{ width: 145, fontSize: '0.82rem' }}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="Depuis le"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>→</span>
            <input
              type="date"
              className="form-control"
              style={{ width: 145, fontSize: '0.82rem' }}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="Jusqu'au"
            />

            {hasLogFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setFilterEvent(''); setFilterUser(''); setDateFrom(''); setDateTo(''); }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Tableau des logs */}
          {logsLoading ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chargement…
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {hasLogFilters ? 'Aucun événement ne correspond aux filtres.' : 'Aucun événement enregistré.'}
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Date / Heure</th>
                    <th>Événement</th>
                    <th>Adresse IP</th>
                    <th>Utilisateur</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const cfg = EVENT_CONFIG[log.event_type] || { label: log.event_type || '—', color: 'var(--text-muted)' };
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }} className="td-muted">
                          {fmtDate(log.created_at)}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 9px', borderRadius: 100,
                            fontSize: '0.72rem', fontWeight: 700,
                            background: cfg.color + '1a', color: cfg.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td>
                          {log.ip
                            ? <code style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.ip}</code>
                            : <span className="td-muted">—</span>}
                        </td>
                        <td className="td-muted" style={{ fontSize: '0.83rem' }}>
                          {log.username || '—'}
                        </td>
                        <td className="td-muted" style={{ fontSize: '0.75rem', maxWidth: 260 }}>
                          <span title={log.details ? JSON.stringify(log.details) : ''}>
                            {fmtDetails(log.details)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalDisplay > LOG_LIMIT && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 20px', borderTop: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {logOffset + 1}–{Math.min(logOffset + LOG_LIMIT, totalDisplay)} sur {totalDisplay.toLocaleString('fr-FR')}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={logOffset === 0}
                  onClick={() => setLogOffset(o => Math.max(0, o - LOG_LIMIT))}
                >
                  ← Précédent
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={logOffset + LOG_LIMIT >= totalDisplay}
                  onClick={() => setLogOffset(o => o + LOG_LIMIT)}
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL : Ajouter une IP ═══════════════════════════════════════════ */}
      {showAddIP && (
        <div className="modal-overlay" onClick={() => { setShowAddIP(false); setIpForm({ ip: '', description: '' }); }}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Ajouter une IP à la whitelist</div>
              <button className="modal-close" onClick={() => { setShowAddIP(false); setIpForm({ ip: '', description: '' }); }}>
                <IcoClose />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Adresse IP ou plage CIDR *</label>
                <input
                  className="form-control"
                  value={ipForm.ip}
                  onChange={e => setIpForm(f => ({ ...f, ip: e.target.value }))}
                  placeholder="192.168.1.1   ou   192.168.1.0/24"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddIP()}
                  style={{ fontFamily: 'monospace', fontSize: '0.88rem', letterSpacing: '0.02em' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 5 }}>
                  Supporte les adresses IPv4 et les plages CIDR (ex: 10.0.0.0/8).
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description (optionnel)</label>
                <input
                  className="form-control"
                  value={ipForm.description}
                  onChange={e => setIpForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Bureau, VPN entreprise, serveur de staging…"
                  onKeyDown={e => e.key === 'Enter' && handleAddIP()}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowAddIP(false); setIpForm({ ip: '', description: '' }); }}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleAddIP} disabled={ipSaving}>
                {ipSaving ? 'Ajout…' : 'Ajouter à la whitelist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Export enveloppé dans le ErrorBoundary ────────────────────────────────────

export default function Security() {
  return (
    <SecurityErrorBoundary>
      <SecurityInner />
    </SecurityErrorBoundary>
  );
}
