import { useState } from 'react';
import { useReminders } from '../contexts/ReminderContext';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function defaultTimeStr() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toTimeString().slice(0, 5);
}

export default function ReminderScheduler() {
  const { schedulerLead, setSchedulerLead, scheduleReminder } = useReminders();
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(defaultTimeStr);
  const [note, setNote] = useState('');

  if (!schedulerLead) return null;

  const lead = schedulerLead;
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';

  const handleClose = () => {
    setSchedulerLead(null);
    setNote('');
  };

  const handleConfirm = () => {
    if (!date || !time) return;
    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt.getTime())) return;
    scheduleReminder(lead, { date, time, note: note.trim() });
    window.dispatchEvent(new CustomEvent('crm:toast', {
      detail: { message: `Rappel planifié pour ${dt.toLocaleDateString('fr-FR')} à ${time}`, type: 'success' }
    }));
    handleClose();
  };

  const scheduled = date && time ? new Date(`${date}T${time}`) : null;
  const isValid = scheduled && !isNaN(scheduled.getTime()) && scheduled > new Date();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1c1c1e',
          borderRadius: 20,
          padding: 0,
          width: '100%', maxWidth: 400,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0a84ff 0%, #0055d4 100%)',
          padding: '20px 24px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Planifier un rappel
              </div>
              <div style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{fullName}</div>
              {lead.phone && (
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', marginTop: 2 }}>{lead.phone}</div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                min={todayStr()}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: 'white', padding: '10px 12px', fontSize: '0.9rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Heure
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: 'white', padding: '10px 12px', fontSize: '0.9rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Quick time shortcuts */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Dans 30min', mins: 30 },
              { label: 'Dans 1h', mins: 60 },
              { label: 'Dans 2h', mins: 120 },
              { label: 'Demain 9h', special: 'tomorrow9' },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => {
                  if (opt.special === 'tomorrow9') {
                    const d = new Date(); d.setDate(d.getDate() + 1);
                    setDate(d.toISOString().slice(0, 10));
                    setTime('09:00');
                  } else {
                    const d = new Date(Date.now() + opt.mins * 60000);
                    setDate(d.toISOString().slice(0, 10));
                    setTime(d.toTimeString().slice(0, 5));
                  }
                }}
                style={{
                  background: 'rgba(10,132,255,0.15)', border: '1px solid rgba(10,132,255,0.4)',
                  borderRadius: 8, color: '#0a84ff', fontSize: '0.75rem', fontWeight: 600,
                  padding: '5px 10px', cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Rappeler pour l'offre premium…"
              rows={2}
              style={{
                width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: 'white', padding: '10px 12px', fontSize: '0.85rem',
                outline: 'none', resize: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {!isValid && date && time && (
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#ff453a' }}>
              La date/heure doit être dans le futur.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 24px 20px',
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: isValid ? 'linear-gradient(135deg, #0a84ff, #0055d4)' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: isValid ? 'white' : 'rgba(255,255,255,0.3)',
              fontSize: '0.9rem', fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed',
            }}
          >
            Planifier
          </button>
        </div>
      </div>
    </div>
  );
}
