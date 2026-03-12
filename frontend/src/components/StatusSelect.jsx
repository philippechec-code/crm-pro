import { useState, useEffect, useRef, useCallback } from 'react';
const STATUSES = [
  { id: 'nouveau', label: 'Nouveau', color: '#0a84ff' },
  { id: 'en_cours', label: 'En cours', color: '#ff9f0a' },
  { id: 'rappel', label: 'Rappel', color: '#bf5af2' },
  { id: 'interesse', label: 'Intéressé', color: '#30d158' },
  { id: 'vendu', label: 'Vendu', color: '#00c7be' },
  { id: 'pas_interesse', label: 'Pas intéressé', color: '#ff453a' },
  { id: 'sans_reponse', label: 'Sans réponse', color: '#8e8e93' },
];

const STATUS_ICONS = {
  nouveau:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  en_cours:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  rappel:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  transforme:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>,
  ne_repond_pas: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  refus:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

const GENERIC_DOT = <svg viewBox="0 0 24 24" fill="currentColor" width="8" height="8"><circle cx="12" cy="12" r="6"/></svg>;

export default function StatusSelect({ value, onChange }) {
  const [open, setOpen]         = useState(false);
  const [statuses, setStatuses] = useState(STATUSES);
  const [hovered, setHovered]   = useState(null);
  const [pos, setPos]           = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  // Reload statuses when closed (picks up new ones added)
  useEffect(() => {
    // Statuts statiques
  }, [open]);

  // Close on outside click only — no scroll listener
  const handleOutsideClick = useCallback((e) => {
    if (
      btnRef.current  && !btnRef.current.contains(e.target) &&
      dropRef.current && !dropRef.current.contains(e.target)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay so the current click doesn't immediately close
      const id = setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
      }, 0);
      return () => {
        clearTimeout(id);
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [open, handleOutsideClick]);

  const toggleOpen = () => {
    if (!btnRef.current) return;
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const maxH = Math.min(320, Math.max(spaceBelow, spaceAbove));
      const openBelow = spaceBelow >= spaceAbove || spaceBelow >= 160;
      setPos({
        top: openBelow ? rect.bottom + 4 : rect.top - 4,
        left: rect.left,
        maxH,
        openBelow,
      });
    }
    setOpen(o => !o);
  };

  const handleSelect = (id) => {
    setOpen(false);
    setHovered(null);
    if (id !== value) onChange(id);
  };

  const current = statuses.find(s => s.id === value);
  const color   = current?.color || '#8e8e93';

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────── */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 10px 5px 8px', borderRadius: 8,
          fontSize: '0.8rem', fontWeight: 600,
          background: open ? color + '28' : color + '18',
          color,
          border: `1.5px solid ${color}${open ? '70' : '35'}`,
          cursor: 'pointer', whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
        title="Changer le statut"
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {STATUS_ICONS[value] || GENERIC_DOT}
        </span>
        {current?.label || value || '—'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          width="10" height="10"
          style={{ opacity: 0.55, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* ── Dropdown — position: fixed, ne scroll pas ─────────── */}
      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: pos.openBelow ? pos.top : undefined,
            bottom: pos.openBelow ? undefined : window.innerHeight - (pos.top) + 4,
            left: pos.left,
            zIndex: 9999,
            background: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 4,
            minWidth: 210,
            maxHeight: pos.maxH || 320,
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.75)',
            animation: 'fadeSlideDown 0.14s ease',
          }}
        >
          {statuses.map(s => {
            const isActive  = s.id === value;
            const isHov     = hovered === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px',
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer', textAlign: 'left',
                  background: isActive ? s.color + '22' : isHov ? 'rgba(255,255,255,0.07)' : 'transparent',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Barre gauche colorée */}
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6,
                  width: 3, borderRadius: 3,
                  background: isActive || isHov ? s.color : 'transparent',
                }} />

                {/* Icône */}
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: s.color + '1a', color: s.color,
                }}>
                  {STATUS_ICONS[s.id] || GENERIC_DOT}
                </span>

                {/* Label */}
                <span style={{
                  flex: 1, fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? s.color : 'var(--text-primary)',
                }}>
                  {s.label}
                </span>

                {/* Check actif */}
                {isActive && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    width="14" height="14" style={{ color: s.color, flexShrink: 0 }}>
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
