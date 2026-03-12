const STATUSES = [
  { id: 'nouveau', label: 'Nouveau', color: '#0a84ff' },
  { id: 'en_cours', label: 'En cours', color: '#ff9f0a' },
  { id: 'rappel', label: 'Rappel', color: '#bf5af2' },
  { id: 'interesse', label: 'Intéressé', color: '#30d158' },
  { id: 'vendu', label: 'Vendu', color: '#00c7be' },
  { id: 'pas_interesse', label: 'Pas intéressé', color: '#ff453a' },
  { id: 'sans_reponse', label: 'Sans réponse', color: '#8e8e93' },
];

export default function StatusBadge({ status }) {
  const statuses = STATUSES;
  const s = statuses.find(x => x.id === status);
  const label = s?.label || status || '—';
  const color = s?.color || '#8e8e93';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 100,
      fontSize: '0.72rem', fontWeight: 600,
      background: color + '22', color,
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}

export function getStatusLabel(statusId) {
  const statuses = STATUSES;
  return statuses.find(s => s.id === statusId)?.label || statusId || '—';
}
