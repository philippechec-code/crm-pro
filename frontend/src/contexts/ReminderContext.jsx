import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import storage from '../services/storage';
import { useAuth } from './AuthContext';

const ReminderContext = createContext(null);

function playSound(type = 'main') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'pre') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    }
  } catch (e) { /* ignore – autoplay policy */ }
}

export function ReminderProvider({ children }) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [schedulerLead, setSchedulerLead] = useState(null); // lead object to schedule
  const [activeAlerts, setActiveAlerts] = useState([]); // [{ alertId, type:'pre'|'main', reminder }]
  const alertIdRef = useRef(0);

  const reload = useCallback(() => {
    setReminders(storage.getReminders());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Listen for crm:open-scheduler event dispatched from status change handlers
  useEffect(() => {
    const handler = (e) => setSchedulerLead(e.detail?.lead || null);
    window.addEventListener('crm:open-scheduler', handler);
    return () => window.removeEventListener('crm:open-scheduler', handler);
  }, []);

  // Check reminders every 30 seconds
  useEffect(() => {
    const check = () => {
      if (!user) return;
      const now = new Date();
      const pending = storage.getReminders().filter(r =>
        r.status === 'pending' && r.agent_id === user.id
      );
      let dirty = false;
      const newAlerts = [];

      pending.forEach(r => {
        const scheduled = new Date(r.scheduled_at);
        const diff = scheduled - now; // ms

        // Pre-alert: within the 15-minute window (between 16min and 0min before)
        if (!r.notified_pre && diff > 0 && diff <= 16 * 60 * 1000) {
          storage.updateReminder(r.id, { notified_pre: true });
          newAlerts.push({ alertId: ++alertIdRef.current, type: 'pre', reminder: { ...r, notified_pre: true } });
          dirty = true;
        }
        // Main alert: overdue and not yet notified
        if (!r.notified_main && diff <= 0) {
          storage.updateReminder(r.id, { notified_main: true });
          newAlerts.push({ alertId: ++alertIdRef.current, type: 'main', reminder: { ...r, notified_main: true } });
          dirty = true;
        }
      });

      if (newAlerts.length > 0) {
        setActiveAlerts(prev => [...prev, ...newAlerts]);
        playSound(newAlerts[0].type);
      }
      if (dirty) reload();
    };

    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [user, reload]);

  const scheduleReminder = useCallback((lead, { date, time, note }) => {
    if (!user) return;
    storage.createReminder({
      lead_id: lead.id,
      lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—',
      lead_phone: lead.phone || '',
      agent_id: user.id,
      agent_name: user.full_name || user.email,
      scheduled_at: new Date(`${date}T${time}`).toISOString(),
      note: note || '',
    });
    reload();
  }, [user, reload]);

  const dismissAlert = useCallback((alertId) => {
    setActiveAlerts(prev => prev.filter(a => a.alertId !== alertId));
  }, []);

  const snoozeAlert = useCallback((alertId, minutes) => {
    setActiveAlerts(prev => {
      const alert = prev.find(a => a.alertId === alertId);
      if (!alert) return prev;
      const newTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      storage.updateReminder(alert.reminder.id, {
        scheduled_at: newTime,
        notified_pre: false,
        notified_main: false,
      });
      reload();
      return prev.filter(a => a.alertId !== alertId);
    });
  }, [reload]);

  const markDone = useCallback((reminderId, leadId) => {
    storage.updateReminder(reminderId, {
      status: 'done',
      done_at: new Date().toISOString(),
    });
    if (leadId) {
      storage.updateLead(leadId, { status: 'en_cours' }, user?.id);
    }
    setActiveAlerts(prev => prev.filter(a => a.reminder.id !== reminderId));
    reload();
  }, [user, reload]);

  const cancelReminder = useCallback((reminderId) => {
    storage.updateReminder(reminderId, { status: 'cancelled' });
    setActiveAlerts(prev => prev.filter(a => a.reminder.id !== reminderId));
    reload();
  }, [reload]);

  // pending count for current user
  const pendingCount = reminders.filter(r =>
    r.status === 'pending' && user && r.agent_id === user.id
  ).length;

  return (
    <ReminderContext.Provider value={{
      reminders, reload,
      schedulerLead, setSchedulerLead,
      scheduleReminder,
      activeAlerts, dismissAlert, snoozeAlert, markDone, cancelReminder,
      pendingCount,
    }}>
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error('useReminders must be used inside ReminderProvider');
  return ctx;
}
