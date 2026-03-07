import { useState, useEffect, useRef, useCallback } from 'react';
import storage from '../services/storage';

// Generate a consistent color from a string
function strColor(str) {
  const palette = [
    '#a78bfa', '#38bdf8', '#fb923c', '#34d399',
    '#f472b6', '#facc15', '#60a5fa', '#4ade80',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AgentSelect({ value, onChange }) {
  const [open, setOpen]       = useState(false);
  const [agents, setAgents]   = useState([]);
  const [hovered, setHovered] = useState(null);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open) {
      const all = storage.getUsers().filter(u => u.active !== false);
      setAgents(all);
    }
  }, [open]);

  const handleOutsideClick = useCallback((e) => {
    if (
      btnRef.current  && !btnRef.current.contains(e.target) &&
      dropRef.current && !dropRef.current.contains(e.target)
    ) setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => document.addEventListener('mousedown', handleOutsideClick), 0);
      return () => { clearTimeout(id); document.removeEventListener('mousedown', handleOutsideClick); };
    }
  }, [open, handleOutsideClick]);

  const toggleOpen = () => {
    if (!btnRef.current) return;
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  const handleSelect = (id) => {
    setOpen(false);
    setHovered(null);
    if (id !== value) onChange(id);
  };

  const current = agents.find(a => a.id === value);
  const label   = current ? (current.full_name || current.email) : 'Non assigné';
  const color   = current ? strColor(current.id) : '#6b7280';
  const ini     = current ? initials(current.full_name || current.email) : '—';

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────── */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '4px 10px 4px 6px', borderRadius: 8,
          fontSize: '0.8rem', fontWeight: 600,
          background: open ? (current ? color + '28' : 'rgba(255,255,255,0.07)') : (current ? color + '16' : 'transparent'),
          color: current ? color : 'var(--text-muted)',
          border: `1.5px solid ${current ? color + (open ? '60' : '30') : 'rgba(255,255,255,0.1)'}`,
          cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
        }}
        title="Changer l'agent"
      >
        {/* Avatar */}
        <span style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: current ? color + '28' : 'rgba(255,255,255,0.08)',
          color: current ? color : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 700,
        }}>
          {ini}
        </span>
        {label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          width="10" height="10"
          style={{ opacity: 0.55, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* ── Dropdown ─────────────────────────────────────────── */}
      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 4,
            minWidth: 220,
            boxShadow: '0 20px 60px rgba(0,0,0,0.75)',
            animation: 'fadeSlideDown 0.14s ease',
          }}
        >
          {/* Option "Non assigné" */}
          {[{ id: null, full_name: 'Non assigné', role: null }, ...agents].map(a => {
            const isActive = a.id === value || (a.id === null && !value);
            const isHov    = hovered === (a.id ?? '__none__');
            const aColor   = a.id ? strColor(a.id) : '#6b7280';
            const aIni     = a.id ? initials(a.full_name || a.email) : '—';
            const aLabel   = a.id ? (a.full_name || a.email) : 'Non assigné';
            return (
              <button
                key={a.id ?? '__none__'}
                onClick={() => handleSelect(a.id)}
                onMouseEnter={() => setHovered(a.id ?? '__none__')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px',
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer', textAlign: 'left',
                  background: isActive ? aColor + '22' : isHov ? 'rgba(255,255,255,0.07)' : 'transparent',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Barre gauche */}
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6,
                  width: 3, borderRadius: 3,
                  background: isActive || isHov ? aColor : 'transparent',
                }} />

                {/* Avatar */}
                <span style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: aColor + '1a', color: aColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  {aIni}
                </span>

                {/* Infos */}
                <span style={{ flex: 1 }}>
                  <span style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? aColor : 'var(--text-primary)',
                  }}>
                    {aLabel}
                  </span>
                  {a.role && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {a.role === 'admin' ? 'Administrateur' : 'Agent'}
                    </span>
                  )}
                </span>

                {/* Check actif */}
                {isActive && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    width="14" height="14" style={{ color: aColor, flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
