import storage from '../services/storage';

export default function StatusBadge({ status }) {
  const statuses = storage.getStatuses();
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
  const statuses = storage.getStatuses();
  return statuses.find(s => s.id === statusId)?.label || statusId || '—';
}
