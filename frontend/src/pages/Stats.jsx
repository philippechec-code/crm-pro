import { useEffect, useState } from 'react';
import { statsApi } from '../services/api';

export default function Stats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await statsApi.get();
        if (mounted) setData(res.data);
      } catch (err) {
        if (mounted) setError('Impossible de charger les statistiques');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="page-scroll">
      <h2>Statistiques</h2>

      {loading && <div>Chargement...</div>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Prospects</div>
            <div className="stat-value">{data?.leads_count ?? '—'}</div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Conversion</div>
            <div className="stat-value">{data?.conversion_rate ? `${data.conversion_rate}%` : '—'}</div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Appels</div>
            <div className="stat-value">{data?.calls_count ?? '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
