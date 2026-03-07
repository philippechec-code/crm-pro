import { useNavigate } from 'react-router-dom';
import { useReminders } from '../contexts/ReminderContext';

export default function ReminderAlerts() {
  const { activeAlerts, dismissAlert, snoozeAlert, markDone } = useReminders();
  const navigate = useNavigate();

  if (activeAlerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 12,
      maxWidth: 360, width: '100%',
    }}>
      {activeAlerts.map(alert => (
        alert.type === 'pre'
          ? <PreAlert key={alert.alertId} alert={alert} onDismiss={() => dismissAlert(alert.alertId)} />
          : <MainAlert key={alert.alertId} alert={alert}
              onDismiss={() => dismissAlert(alert.alertId)}
              onSnooze={(m) => snoozeAlert(alert.alertId, m)}
              onDone={() => markDone(alert.reminder.id, alert.reminder.lead_id)}
              onView={() => { dismissAlert(alert.alertId); navigate(`/leads/${alert.reminder.lead_id}`); }}
            />
      ))}
    </div>
  );
}

function PreAlert({ alert, onDismiss }) {
  const { reminder } = alert;
  const scheduled = new Date(reminder.scheduled_at);
  const diff = Math.round((scheduled - Date.now()) / 60000);

  return (
    <div style={{
      background: '#1c1c1e',
      border: '1px solid rgba(255,159,10,0.5)',
      borderLeft: '4px solid #ff9f0a',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,159,10,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#ff9f0a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rappel dans {diff} minute{diff !== 1 ? 's' : ''}
            </div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>{reminder.lead_name}</div>
            {reminder.lead_phone && (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{reminder.lead_phone}</div>
            )}
            {reminder.note && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 4, fontStyle: 'italic' }}>{reminder.note}</div>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function MainAlert({ alert, onDismiss, onSnooze, onDone, onView }) {
  const { reminder } = alert;
  const scheduled = new Date(reminder.scheduled_at);
  const overdue = Date.now() - scheduled > 0;
  const overdueMin = overdue ? Math.round((Date.now() - scheduled) / 60000) : 0;

  return (
    <div style={{
      background: '#1c1c1e',
      border: '1px solid rgba(10,132,255,0.5)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
      animation: 'slideIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a84ff 0%, #0055d4 100%)',
        padding: '14px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="18" height="18">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {overdueMin > 0 ? `En retard de ${overdueMin} min` : "Rappel maintenant"}
            </div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
              {scheduled.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px 8px', fontSize: '0.72rem' }}
        >
          Ignorer
        </button>
      </div>

      {/* Lead info */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'white' }}>{reminder.lead_name}</div>
        {reminder.lead_phone && (
          <a
            href={`tel:${reminder.lead_phone}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#0a84ff', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.9 19.79 19.79 0 0 1 1.62 4.35 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.97-1.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            {reminder.lead_phone}
          </a>
        )}
        {reminder.note && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
            {reminder.note}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Primary actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDone}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'linear-gradient(135deg, #30d158, #25a244)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Traité
          </button>
          <button
            onClick={onView}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'rgba(10,132,255,0.2)', border: '1px solid rgba(10,132,255,0.4)',
              color: '#0a84ff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Voir la fiche
          </button>
        </div>

        {/* Snooze options */}
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginRight: 2 }}>Reporter</span>
          {[
            { label: '+15 min', mins: 15 },
            { label: '+30 min', mins: 30 },
            { label: '+1h', mins: 60 },
          ].map(opt => (
            <button
              key={opt.mins}
              onClick={() => onSnooze(opt.mins)}
              style={{
                flex: 1, padding: '6px 4px', borderRadius: 8,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
