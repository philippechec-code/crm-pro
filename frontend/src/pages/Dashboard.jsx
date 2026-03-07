import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useReminders } from '../contexts/ReminderContext';
import storage from '../services/storage';
import StatusSelect from '../components/StatusSelect';
import AgentSelect from '../components/AgentSelect';
import { StatusManagerModal } from './Leads';

function toast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: msg, type } }));
}

// ── Helpers de période ────────────────────────────────────────────────────────

function getWeekRange(weeksAgo = 0) {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // jours depuis lundi
  const mon  = new Date(now);
  mon.setDate(now.getDate() - diff - weeksAgo * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 7);
  return { from: mon, to: sun };
}

function getPeriodRange(period) {
  const now = new Date();
  if (period === 'week') {
    const day  = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const mon  = new Date(now);
    mon.setDate(now.getDate() - diff);
    mon.setHours(0, 0, 0, 0);
    return { from: mon, to: now };
  }
  if (period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
  }
  return { from: new Date(0), to: now };
}

const SOURCE_PALETTE = [
  '#0a84ff', '#30d158', '#ff9f0a', '#bf5af2',
  '#ff453a', '#5ac8fa', '#ffd60a', '#ff6b6b',
];

export default function Dashboard() {
  const { user } = useAuth();
  const [leads, setLeads]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [statuses, setStatuses] = useState([]);

  function reload() {
    setLeads(storage.getLeads());
    setUsers(storage.getUsers());
    setStatuses(storage.getStatuses());
  }

  useEffect(() => { reload(); }, []);

  const isAdmin = user?.role === 'admin';

  const myLeads = useMemo(() =>
    isAdmin ? leads : leads.filter(l => l.assigned_to === user?.id),
  [leads, isAdmin, user]);

  const stats = useMemo(() => {
    const byStatus = {};
    statuses.forEach(s => { byStatus[s.id] = 0; });
    myLeads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    const week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return {
      total: myLeads.length,
      newThisWeek: myLeads.filter(l => new Date(l.created_at) >= week).length,
      byStatus,
    };
  }, [myLeads, statuses]);

  const getUserName = id => {
    const u = users.find(x => x.id === id);
    return u?.full_name || u?.email || '—';
  };

  return isAdmin
    ? <AdminDashboard leads={leads} users={users} statuses={statuses} stats={stats} myLeads={myLeads} reload={reload} user={user} getUserName={getUserName} />
    : <AgentDashboard statuses={statuses} myLeads={myLeads} reload={reload} user={user} />;
}

/* ─────────────────────────────────────────────────────────────
   ADMIN DASHBOARD (unchanged)
───────────────────────────────────────────────────────────── */
function AdminDashboard({ leads, users, statuses, stats, myLeads, reload, user, getUserName }) {
  const recent = useMemo(() => [...myLeads].slice(0, 8), [myLeads]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-top">
        <div className="page-header">
          <div>
            <div className="page-title">Tableau de bord</div>
            <div className="page-subtitle">Vue globale du CRM</div>
          </div>
          <div className="header-actions">
            <Link to="/leads" className="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Tous les prospects
            </Link>
          </div>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total" value={stats.total} color="var(--accent)" icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          } />
          <StatCard label="Nouveaux (7j)" value={stats.newThisWeek} color="var(--success)" icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          } />
          {statuses.map(s => (
            <StatCard key={s.id} label={s.label} value={stats.byStatus[s.id] || 0} color={s.color} />
          ))}
        </div>

        {users.filter(u => u.role === 'agent').length > 0 && (
          <div className="card" style={{ padding: 0, marginBottom: 16 }}>
            <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ fontWeight: 700 }}>Agents</div>
              <Link to="/users" style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>Gérer →</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {users.filter(u => u.role === 'agent' && u.active !== false).map(u => {
                const agLeads = leads.filter(l => l.assigned_to === u.id);
                const transformed = agLeads.filter(l => l.status === 'transforme').length;
                const rate = agLeads.length > 0 ? Math.round((transformed / agLeads.length) * 100) : 0;
                return (
                  <div key={u.id} style={{
                    flex: '1 1 200px', padding: '14px 20px',
                    borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: 12, alignItems: 'center',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {(u.full_name || u.email).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {agLeads.length} prospect{agLeads.length !== 1 ? 's' : ''} · {rate}% transformés
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: 'var(--success)', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All-time summary per source (admin) */}
        <AllTimeSourceSummary leads={leads} />

        <SourceConversionChart leads={leads} />
        <AgentActivityTable leads={leads} users={users} statuses={statuses} />

        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title" style={{ fontWeight: 700 }}>Prospects récents</div>
            <Link to="/leads" style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>Tout voir →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <h3 style={{ marginTop: 8 }}>Aucun prospect</h3>
              <p>Créez votre premier prospect.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th><th>Téléphone</th>
                    <th className="col-email">Email</th>
                    <th>Statut</th>
                    <th className="col-agent">Assigné à</th>
                    <th className="col-date">Créé le</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(l => (
                    <tr key={l.id}>
                      <td>
                        <Link to={`/leads/${l.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                        </Link>
                        {l.city && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.city}</div>}
                      </td>
                      <td className="td-muted">{l.phone || '—'}</td>
                      <td className="td-muted col-email">{l.email || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <StatusSelect value={l.status} onChange={s => {
                          storage.updateLead(l.id, { status: s }, user?.id); reload(); toast('Statut mis à jour', 'success');
                          if (s === 'rappel') window.dispatchEvent(new CustomEvent('crm:open-scheduler', { detail: { lead: l } }));
                        }} />
                      </td>
                      <td className="td-muted col-agent">{getUserName(l.assigned_to)}</td>
                      <td className="td-muted col-date">{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <Link to={`/leads/${l.id}`} className="btn btn-ghost btn-icon" title="Voir">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAUX DE CONVERSION PAR SOURCE (admin only)
───────────────────────────────────────────────────────────── */
function SourceConversionChart({ leads }) {
  const [period, setPeriod] = useState('month');

  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  const data = useMemo(() => {
    const inRange = leads.filter(l => {
      const d = new Date(l.created_at);
      return d >= from && d <= to;
    });
    const map = {};
    inRange.forEach(l => {
      const src = l.source?.trim() || 'Non renseignée';
      if (!map[src]) map[src] = { total: 0, converted: 0 };
      map[src].total++;
      if (l.status === 'transforme') map[src].converted++;
    });

    // compute all-time totals per source
    const allTime = {};
    leads.forEach(l => {
      const src = l.source?.trim() || 'Non renseignée';
      if (!allTime[src]) allTime[src] = { total: 0, converted: 0 };
      allTime[src].total++;
      if (l.status === 'transforme') allTime[src].converted++;
    });

    return Object.entries(map)
      .map(([source, { total, converted }]) => {
        const a = allTime[source] || { total: 0, converted: 0 };
        const allTimeRate = a.total > 0 ? Math.round((a.converted / a.total) * 100) : 0;
        return {
          source,
          total,
          converted,
          rate: total > 0 ? Math.round((converted / total) * 100) : 0,
          allTimeTotal: a.total,
          allTimeConverted: a.converted,
          allTimeRate,
        };
      })
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [leads, from, to]);

  const totalLeads = data.reduce((s, d) => s + d.total, 0);
  const maxTotal   = Math.max(...data.map(d => d.total), 1);

  const PERIODS = [['week', 'Cette semaine'], ['month', 'Ce mois'], ['quarter', 'Ce trimestre'], ['all', 'All-time']];

  return (
    <div className="card" style={{ padding: 0, marginBottom: 16 }}>
      <div className="card-header" style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div className="card-title" style={{ fontWeight: 700 }}>Taux de conversion par source</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} · {data.length} source{data.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {PERIODS.map(([v, l]) => (
            <button
              key={v}
              className={`btn btn-sm ${period === v ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Aucun lead sur cette période
        </div>
      ) : (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((row, i) => {
            const color = SOURCE_PALETTE[i % SOURCE_PALETTE.length];
            return (
              <div key={row.source}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{row.source}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {row.total} lead{row.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {row.converted} converti{row.converted !== 1 ? 's' : ''}
                    </span>
                    <span style={{
                      fontWeight: 800, fontSize: '0.9rem', minWidth: 38, textAlign: 'right',
                      color: row.rate >= 20 ? '#30d158' : row.rate >= 8 ? '#ff9f0a' : 'var(--text-muted)',
                    }}>
                      {row.rate}%
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                      (all-time {row.allTimeRate}%)
                    </span>
                  </div>
                </div>
                {/* Barre volume (proportion de leads) */}
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{
                    width: `${(row.total / maxTotal) * 100}%`, height: '100%',
                    background: color + '44', borderRadius: 2, transition: 'width 0.4s ease',
                  }} />
                </div>
                {/* Barre taux de conversion */}
                <div style={{ height: 7, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${row.rate}%`, height: '100%',
                    background: color, borderRadius: 3, transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AllTimeSourceSummary({ leads }) {
  const data = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      const src = l.source?.trim() || 'Non renseignée';
      if (!map[src]) map[src] = { total: 0, converted: 0 };
      map[src].total++;
      if (l.status === 'transforme') map[src].converted++;
    });
    return Object.entries(map).map(([source, { total, converted }]) => ({
      source,
      total,
      converted,
      rate: total > 0 ? Math.round((converted / total) * 100) : 0,
    })).sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [leads]);

  if (!data.length) return null;

  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Taux de conversion (All-time)</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{data.length} source{data.length!==1?'s':''}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {data.slice(0, 8).map((r, i) => (
          <div key={r.source} style={{ minWidth: 160, flex: '1 1 160px', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700 }}>{r.source}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{r.total} lead{r.total!==1?'s':''} · {r.converted} converti{r.converted!==1?'s':''}</div>
            <div style={{ marginTop: 8, fontWeight: 800, fontSize: '1rem' }}>{r.rate}%</div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${r.rate}%`, height: '100%', background: '#34d399' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LEADS TRAITÉS PAR AGENT (admin only)
───────────────────────────────────────────────────────────── */
function AgentActivityTable({ leads, users, statuses }) {
  const agents = useMemo(
    () => users.filter(u => u.role === 'agent' && u.active !== false),
    [users]
  );

  const thisWeek = useMemo(() => getWeekRange(0), []);
  const lastWeek = useMemo(() => getWeekRange(1), []);

  // Calcule pour une plage de semaine le nombre de leads traités par agent
  function computeActivity(weekRange) {
    const result = {};
    agents.forEach(a => { result[a.id] = { count: 0, byStatus: {} }; });
    leads.forEach(lead => {
      if (!Array.isArray(lead.history)) return;
      const wh = lead.history.filter(h => {
        const d = new Date(h.created_at);
        return d >= weekRange.from && d < weekRange.to;
      });
      if (!wh.length) return;
      new Set(wh.map(h => h.user_id).filter(Boolean)).forEach(agentId => {
        if (!result[agentId]) return;
        result[agentId].count++;
        const st = lead.status || 'nouveau';
        result[agentId].byStatus[st] = (result[agentId].byStatus[st] || 0) + 1;
      });
    });
    return result;
  }

  const thisWeekStats = useMemo(
    () => computeActivity(thisWeek),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, agents, thisWeek]
  );
  const lastWeekStats = useMemo(
    () => computeActivity(lastWeek),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, agents, lastWeek]
  );

  const ranked = useMemo(() =>
    [...agents]
      .map(a => ({
        ...a,
        count:      thisWeekStats[a.id]?.count    || 0,
        byStatus:   thisWeekStats[a.id]?.byStatus || {},
        prevCount:  lastWeekStats[a.id]?.count    || 0,
      }))
      .sort((a, b) => b.count - a.count),
    [agents, thisWeekStats, lastWeekStats]
  );

  // Colonnes statut affichées (uniquement les statuts built-in pertinents)
  const KEY_STATUSES = ['transforme', 'rappel', 'ne_repond_pas', 'en_cours', 'refus'];
  const shownStatuses = statuses.filter(s => KEY_STATUSES.includes(s.id));

  const mondayLabel = thisWeek.from.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const totalThisWeek = ranked.reduce((s, a) => s + a.count, 0);

  if (!agents.length) return null;

  return (
    <div className="card" style={{ padding: 0, marginBottom: 16 }}>
      <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="card-title" style={{ fontWeight: 700 }}>Activité agents — semaine en cours</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Depuis le lundi {mondayLabel} · {totalThisWeek} lead{totalThisWeek !== 1 ? 's' : ''} traité{totalThisWeek !== 1 ? 's' : ''} cette semaine
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Agent</th>
              <th style={{ textAlign: 'center' }}>Leads traités</th>
              {shownStatuses.map(s => (
                <th key={s.id} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{s.label}</th>
              ))}
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>vs sem. préc.</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((agent, idx) => {
              const delta = agent.count - agent.prevCount;
              const initials = (agent.full_name || agent.email || '?')
                .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <tr key={agent.id}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                    {idx === 0 && agent.count > 0 ? '🏆' : `${idx + 1}`}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'var(--accent-light)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.68rem', fontWeight: 700,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {agent.full_name || agent.email}
                        </div>
                        {agent.count > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                            {Object.keys(agent.byStatus).length} statut{Object.keys(agent.byStatus).length !== 1 ? 's' : ''} différent{Object.keys(agent.byStatus).length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 800, fontSize: '1rem',
                      color: agent.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {agent.count}
                    </span>
                  </td>
                  {shownStatuses.map(s => (
                    <td key={s.id} style={{ textAlign: 'center' }}>
                      {agent.byStatus[s.id] ? (
                        <span style={{
                          display: 'inline-block', padding: '1px 8px', borderRadius: 100,
                          fontSize: '0.72rem', fontWeight: 700,
                          background: s.color + '22', color: s.color,
                        }}>
                          {agent.byStatus[s.id]}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    {agent.count === 0 && agent.prevCount === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    ) : delta > 0 ? (
                      <span style={{ color: '#30d158', fontWeight: 700, fontSize: '0.82rem' }}>↑ +{delta}</span>
                    ) : delta < 0 ? (
                      <span style={{ color: '#ff453a', fontWeight: 700, fontSize: '0.82rem' }}>↓ {delta}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>= {agent.count}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AGENT DASHBOARD — landing groupes + liste filtrée par groupe
───────────────────────────────────────────────────────────── */
function AgentDashboard({ statuses, myLeads, reload, user }) {
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const groups = useMemo(() => storage.getGroups(), []);
  const firstName = user?.full_name?.split(' ')[0] || 'Agent';
  const { reminders, snoozeAlert, markDone, cancelReminder } = useReminders();
  const navigate = useNavigate();

  // Leads par groupe
  const leadsByGroup = useMemo(() => {
    const map = {};
    groups.forEach(g => { map[g.id] = myLeads.filter(l => l.group_id === g.id); });
    return map;
  }, [myLeads, groups]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupLeads    = selectedGroupId ? (leadsByGroup[selectedGroupId] || []) : [];

  if (!selectedGroupId) {
    // ── Vue landing : 2 cartes de groupe ──
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="page-top">
          <div className="page-header">
            <div>
              <div className="page-title">Bonjour, {firstName}</div>
              <div className="page-subtitle">{myLeads.length} prospect{myLeads.length !== 1 ? 's' : ''} assigné{myLeads.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
        <div className="page-scroll">
          <AgentReminderSection reminders={reminders} user={user} markDone={markDone} cancelReminder={cancelReminder} navigate={navigate} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {groups.map(g => {
              const gLeads   = leadsByGroup[g.id] || [];
              const sources  = [...new Set(gLeads.map(l => l.source).filter(Boolean))].sort();
              const byStatus = {};
              statuses.forEach(s => { byStatus[s.id] = 0; });
              gLeads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
              const week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
              const newCount = gLeads.filter(l => new Date(l.created_at) >= week).length;

              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', textAlign: 'left',
                    background: 'var(--bg-card)', border: `1px solid var(--border)`,
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    padding: 0, transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.4)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)'; }}
                >
                  {/* Bande couleur + nom */}
                  <div style={{ background: g.color + '22', borderBottom: `3px solid ${g.color}`, padding: '20px 24px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        background: g.color + '33', color: g.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{g.name}</div>
                        {g.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{g.description}</div>}
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: g.color, lineHeight: 1 }}>{gLeads.length}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>prospects</div>
                      </div>
                      {newCount > 0 && (
                        <div>
                          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>+{newCount}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>cette semaine</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statuts */}
                  <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Répartition</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {statuses.filter(s => byStatus[s.id] > 0).map(s => (
                        <span key={s.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 9px', borderRadius: 100,
                          fontSize: '0.72rem', fontWeight: 600,
                          background: s.color + '22', color: s.color,
                        }}>
                          {byStatus[s.id]} {s.label}
                        </span>
                      ))}
                      {statuses.every(s => !byStatus[s.id]) && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aucun prospect</span>
                      )}
                    </div>
                  </div>

                  {/* Sources */}
                  <div style={{ padding: '12px 24px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Sources</div>
                    {sources.length === 0
                      ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                      : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {sources.map(s => (
                            <span key={s} style={{
                              padding: '2px 8px', borderRadius: 6,
                              fontSize: '0.72rem', fontWeight: 500,
                              background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)',
                            }}>{s}</span>
                          ))}
                        </div>
                    }
                  </div>

                  {/* CTA */}
                  <div style={{ padding: '10px 24px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.8rem', color: g.color, fontWeight: 600 }}>
                      Voir les prospects →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Vue liste : prospects du groupe sélectionné ──
  return (
    <GroupLeadList
      group={selectedGroup}
      groupLeads={groupLeads}
      statuses={statuses}
      user={user}
      reload={reload}
      onBack={() => setSelectedGroupId(null)}
    />
  );
}

function GroupLeadList({ group, groupLeads, statuses, user, reload, onBack }) {
  const [showStatuses, setShowStatuses] = useState(false);
  const [newStatus, setNewStatus]       = useState({ label: '', color: '#60a5fa' });

  const handleAddStatus = () => {
    if (!newStatus.label.trim()) { toast('Nom du statut requis', 'error'); return; }
    const res = storage.createStatus(newStatus);
    if (!res) { toast('Ce statut existe déjà', 'error'); return; }
    toast('Statut créé', 'success');
    setNewStatus({ label: '', color: '#60a5fa' });
    reload();
  };
  const handleDeleteStatus = (id) => {
    const ok = storage.deleteStatus(id);
    if (!ok) { toast('Erreur lors de la suppression', 'error'); return; }
    toast('Statut supprimé', 'success');
    reload();
  };

  const [search, setSearch]                 = useState('');
  const [filterStatuses, setFilterStatuses] = useState(new Set());
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [filterSources, setFilterSources]   = useState(new Set());
  const [sourceDropOpen, setSourceDropOpen] = useState(false);
  const [pageSize, setPageSize]             = useState(50);
  const [page, setPage]                     = useState(1);
  const [pageSizeDropOpen, setPageSizeDropOpen] = useState(false);
  const statusDropRef  = useRef(null);
  const sourceDropRef  = useRef(null);
  const pageSizeDropRef = useRef(null);

  useEffect(() => {
    if (!statusDropOpen) return;
    const handler = (e) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target)) setStatusDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusDropOpen]);

  useEffect(() => {
    if (!sourceDropOpen) return;
    const handler = (e) => {
      if (sourceDropRef.current && !sourceDropRef.current.contains(e.target)) setSourceDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sourceDropOpen]);

  useEffect(() => {
    if (!pageSizeDropOpen) return;
    const handler = (e) => {
      if (pageSizeDropRef.current && !pageSizeDropRef.current.contains(e.target)) setPageSizeDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pageSizeDropOpen]);

  const toggleFilterStatus = (id) => {
    const s = new Set(filterStatuses);
    s.has(id) ? s.delete(id) : s.add(id);
    setFilterStatuses(s);
    setPage(1);
  };

  const toggleFilterSource = (src) => {
    const s = new Set(filterSources);
    s.has(src) ? s.delete(src) : s.add(src);
    setFilterSources(s);
    setPage(1);
  };

  const sources = useMemo(() => {
    const s = new Set(groupLeads.map(l => l.source).filter(Boolean));
    return [...s].sort();
  }, [groupLeads]);

  const groupStats = useMemo(() => {
    const byStatus = {};
    statuses.forEach(s => { byStatus[s.id] = 0; });
    groupLeads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    const week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return { total: groupLeads.length, newThisWeek: groupLeads.filter(l => new Date(l.created_at) >= week).length, byStatus };
  }, [groupLeads, statuses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupLeads.filter(l => {
      if (filterStatuses.size > 0 && !filterStatuses.has(l.status)) return false;
      if (filterSources.size > 0 && !filterSources.has(l.source || '')) return false;
      if (q) {
        const full = `${l.first_name} ${l.last_name} ${l.phone} ${l.email} ${l.source}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [groupLeads, search, filterStatuses, filterSources]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-top">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} className="btn btn-ghost btn-icon" title="Retour aux groupes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, display: 'inline-block', flexShrink: 0 }} />
                <div className="page-title" style={{ margin: 0 }}>{group.name}</div>
              </div>
              <div className="page-subtitle">{groupLeads.length} prospect{groupLeads.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div className="header-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStatuses(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                Gérer les statuts
              </button>
            </div>
          )}
        </div>

        {/* Stat cards du groupe */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
          <StatCard label="Total" value={groupStats.total} color={group.color} icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          } />
          <StatCard label="Nouveaux (7j)" value={groupStats.newThisWeek} color="var(--success)" icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          } />
          {statuses.map(s => (
            <StatCard key={s.id} label={s.label} value={groupStats.byStatus[s.id] || 0} color={s.color} />
          ))}
        </div>

        {/* Filtres */}
        <div className="filters-bar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Rechercher nom, téléphone, email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div ref={statusDropRef} style={{ position: 'relative' }}>
            <button className="filter-select"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 155, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 36, fontSize: '0.85rem', color: filterStatuses.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
              onClick={() => setStatusDropOpen(o => !o)}>
              {filterStatuses.size === 0 ? 'Tous les statuts' : filterStatuses.size === 1 ? statuses.find(s => filterStatuses.has(s.id))?.label : `${filterStatuses.size} statuts`}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {statusDropOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 1000, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {statuses.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = filterStatuses.has(s.id) ? 'rgba(255,255,255,0.05)' : 'transparent'}>
                    <input type="checkbox" checked={filterStatuses.has(s.id)} onChange={() => toggleFilterStatus(s.id)} style={{ accentColor: s.color, width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s.label}</span>
                  </label>
                ))}
                {filterStatuses.size > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 0' }}>
                    <button style={{ width: '100%', padding: '7px 14px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => { setFilterStatuses(new Set()); setStatusDropOpen(false); }}>Tout effacer</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {sources.length > 0 && (
            <div ref={sourceDropRef} style={{ position: 'relative' }}>
              <button className="filter-select"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 155, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 36, fontSize: '0.85rem', color: filterSources.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                onClick={() => setSourceDropOpen(o => !o)}>
                {filterSources.size === 0 ? 'Toutes les sources' : filterSources.size === 1 ? [...filterSources][0] : `${filterSources.size} sources`}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {sourceDropOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 1000, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  {sources.map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = filterSources.has(s) ? 'rgba(255,255,255,0.05)' : 'transparent'}>
                      <input type="checkbox" checked={filterSources.has(s)} onChange={() => toggleFilterSource(s)} style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s}</span>
                    </label>
                  ))}
                  {filterSources.size > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 0' }}>
                      <button style={{ width: '100%', padding: '7px 14px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => { setFilterSources(new Set()); setSourceDropOpen(false); }}>Tout effacer</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {(search || filterStatuses.size > 0 || filterSources.size > 0) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatuses(new Set()); setFilterSources(new Set()); setPage(1); }}>Réinitialiser</button>
          )}

          {/* Sélecteur de taille de page */}
          <div ref={pageSizeDropRef} style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 36, fontSize: '0.85rem', color: 'var(--text-secondary)' }}
              onClick={() => setPageSizeDropOpen(o => !o)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              {pageSize} / page
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {pageSizeDropOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 1000, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 0', minWidth: 140, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {[50, 100, 200].map(n => (
                  <button
                    key={n}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', background: pageSize === n ? 'rgba(255,255,255,0.07)' : 'none',
                      border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                      color: pageSize === n ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: pageSize === n ? 600 : 400,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = pageSize === n ? 'rgba(255,255,255,0.07)' : 'transparent'}
                    onClick={() => { setPageSize(n); setPage(1); setPageSizeDropOpen(false); }}
                  >
                    {pageSize === n && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>}
                    {pageSize !== n && <span style={{ width: 13 }} />}
                    {n} prospects
                  </button>
                ))}
              </div>
            )}
          </div>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="page-scroll">
        <div className="card" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 0' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <h3 style={{ marginTop: 8 }}>{groupLeads.length === 0 ? 'Aucun prospect dans ce groupe' : 'Aucun résultat'}</h3>
              <p>{groupLeads.length === 0 ? 'Contactez votre administrateur.' : "Essayez d'autres filtres."}</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th><th>Téléphone</th>
                    <th className="col-email">Email</th>
                    <th>Statut</th>
                    <th className="col-source">Source</th>
                    <th>Commentaire</th>
                    <th className="col-date">Créé le</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(l => {
                    const statusColor = statuses.find(s => s.id === l.status)?.color || 'var(--text-primary)';
                    return (
                    <tr key={l.id}>
                      <td>
                        {user?.role === 'admin'
                          ? <Link to={`/leads/${l.id}`} style={{ fontWeight: 600, color: statusColor }}>{[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}</Link>
                          : <span style={{ fontWeight: 600, color: statusColor }}>{[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}</span>
                        }
                        {l.city && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.city}</div>}
                      </td>
                      <td style={{ color: statusColor, opacity: 0.8 }}>{l.phone || '—'}</td>
                      <td className="col-email" style={{ color: statusColor, opacity: 0.8 }}>{l.email || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <StatusSelect value={l.status} onChange={s => {
                          storage.updateLead(l.id, { status: s }, user?.id); reload(); toast('Statut mis à jour', 'success');
                          if (s === 'rappel') window.dispatchEvent(new CustomEvent('crm:open-scheduler', { detail: { lead: l } }));
                        }} />
                      </td>
                      <td className="td-muted col-source">
                        {l.source
                          ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:100, fontSize:'0.72rem', fontWeight:600, background:'rgba(255,255,255,0.06)', color:'var(--text-secondary)' }}>{l.source}</span>
                          : <span style={{ color:'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ maxWidth: 220, padding: '4px 8px' }} onClick={e => e.stopPropagation()}>
                        <InlineComment lead={l} onSave={(val) => { storage.updateLead(l.id, { comment: val }, user?.id); reload(); }} />
                      </td>
                      <td className="td-muted col-date">{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Planifier un rappel"
                          style={{ color: '#ff9f0a' }}
                          onClick={() => window.dispatchEvent(new CustomEvent('crm:open-scheduler', { detail: { lead: l } }))}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                        </button>
                        {user?.role === 'admin' && (
                          <Link to={`/leads/${l.id}`} className="btn btn-ghost btn-icon" title="Voir le détail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(1)} disabled={page === 1}
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}>«</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}>‹</button>

              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === '…'
                    ? <span key={`e${i}`} style={{ padding: '4px 6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>…</span>
                    : <button key={n} onClick={() => setPage(n)} style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: n === page ? 700 : 400,
                        background: n === page ? 'var(--accent)' : 'transparent',
                        color: n === page ? '#fff' : 'var(--text-secondary)',
                      }}>{n}</button>
                  )}
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}>›</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}>»</button>

              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} sur {filtered.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Gérer les statuts ── */}
      {showStatuses && (
        <StatusManagerModal
          statuses={statuses}
          onClose={() => setShowStatuses(false)}
          onAdd={handleAddStatus}
          onDelete={handleDeleteStatus}
          onUpdate={(id, patch) => { storage.updateStatus(id, patch); reload(); }}
          newStatus={newStatus}
          setNewStatus={setNewStatus}
        />
      )}
    </div>
  );
}

function AgentReminderSection({ reminders, user, markDone, cancelReminder, navigate }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const myReminders = (reminders || []).filter(r => r.status === 'pending' && r.agent_id === user?.id);
  if (myReminders.length === 0) return null;

  const overdue    = myReminders.filter(r => new Date(r.scheduled_at) < now);
  const upcoming15 = myReminders.filter(r => { const d = new Date(r.scheduled_at); return d >= now && (d - now) <= 16 * 60 * 1000; });
  const today      = myReminders.filter(r => { const d = new Date(r.scheduled_at); return d >= now && r.scheduled_at.slice(0, 10) === todayStr && (d - now) > 16 * 60 * 1000; });
  const later      = myReminders.filter(r => new Date(r.scheduled_at) >= now && r.scheduled_at.slice(0, 10) > todayStr);

  const ReminderRow = ({ r, accent }) => (
    <div key={r.id} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.lead_name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
          {new Date(r.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {r.lead_phone && <> · {r.lead_phone}</>}
        </div>
        {r.note && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note}</div>}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button title="Voir la fiche" onClick={() => navigate(`/leads/${r.lead_id}`)} className="btn btn-ghost btn-icon btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <button title="Traité" onClick={() => markDone(r.id, r.lead_id)} className="btn btn-ghost btn-icon btn-sm" style={{ color: '#34d399' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button title="Annuler" onClick={() => cancelReminder(r.id)} className="btn btn-ghost btn-icon btn-sm" style={{ color: '#fb7185' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20 }}>
      <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2" width="16" height="16">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div className="card-title" style={{ fontWeight: 700 }}>Mes Rappels</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{myReminders.length} en attente</span>
        </div>
        <Link to="/reminders" style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>Tout voir →</Link>
      </div>

      {overdue.length > 0 && (
        <div>
          <div style={{ padding: '6px 16px', background: 'rgba(251,113,133,0.08)', fontSize: '0.68rem', fontWeight: 700, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            En retard — {overdue.length}
          </div>
          {overdue.map(r => <ReminderRow key={r.id} r={r} accent="#fb7185" />)}
        </div>
      )}
      {upcoming15.length > 0 && (
        <div>
          <div style={{ padding: '6px 16px', background: 'rgba(255,159,10,0.08)', fontSize: '0.68rem', fontWeight: 700, color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Dans 15 minutes — {upcoming15.length}
          </div>
          {upcoming15.map(r => <ReminderRow key={r.id} r={r} accent="#ff9f0a" />)}
        </div>
      )}
      {today.length > 0 && (
        <div>
          <div style={{ padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Aujourd{"'"}hui — {today.length}
          </div>
          {today.map(r => <ReminderRow key={r.id} r={r} accent="#0a84ff" />)}
        </div>
      )}
      {later.length > 0 && (
        <div>
          <div style={{ padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            À venir — {later.length}
          </div>
          {later.slice(0, 3).map(r => <ReminderRow key={r.id} r={r} accent="var(--text-muted)" />)}
          {later.length > 3 && <div style={{ padding: '8px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>+{later.length - 3} autres</div>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {icon && <span style={{ color, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function InlineComment({ lead, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(lead.comment || '');
  const taRef = useRef(null);

  useEffect(() => { setVal(lead.comment || ''); }, [lead.comment]);

  const commit = () => {
    setEditing(false);
    if (val.trim() !== (lead.comment || '').trim()) onSave(val.trim());
  };

  if (editing) {
    return (
      <textarea
        ref={taRef}
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setVal(lead.comment || ''); setEditing(false); } }}
        rows={2}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(10,132,255,0.5)',
          borderRadius: 6, color: 'white', padding: '5px 8px', fontSize: '0.8rem',
          resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      style={{
        minHeight: 28, cursor: 'text', padding: '4px 6px', borderRadius: 6,
        border: '1px solid transparent',
        fontSize: '0.8rem', color: val ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)',
        fontStyle: val ? 'italic' : 'normal',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}
      onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
    >
      {val || 'Ajouter un commentaire…'}
    </div>
  );
}
