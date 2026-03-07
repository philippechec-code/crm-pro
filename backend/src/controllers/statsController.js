const { query } = require('../config/database');

const getStats = async (req, res) => {
  const { group_id, date_from, date_to } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

  if (group_id) { conditions.push(`l.group_id = $${i++}`); values.push(group_id); }
  if (date_from) { conditions.push(`l.created_at >= $${i++}`); values.push(date_from); }
  if (date_to) { conditions.push(`l.created_at <= $${i++}`); values.push(date_to); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [byStatus, byAgent, bySource, totals, recentActivity] = await Promise.all([
      // Répartition par statut
      query(`
        SELECT status, COUNT(*)::int AS count
        FROM leads l ${where}
        GROUP BY status
        ORDER BY count DESC
      `, values),

      // Stats par agent (avec détail des statuts)
      query(`
        SELECT
          u.id AS agent_id,
          u.full_name AS agent_name,
          l.status,
          COUNT(*)::int AS count
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        ${where}
        GROUP BY u.id, u.full_name, l.status
        ORDER BY u.full_name, l.status
      `, values),

      // Répartition par source
      query(`
        SELECT COALESCE(source, 'Non défini') AS source, COUNT(*)::int AS count
        FROM leads l ${where}
        GROUP BY source
        ORDER BY count DESC
      `, values),

      // Totaux globaux
      query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(CASE WHEN status = 'transforme' THEN 1 END)::int AS transformes,
          COUNT(CASE WHEN status = 'rappel' THEN 1 END)::int AS rappels,
          COUNT(CASE WHEN status = 'ne_repond_pas' THEN 1 END)::int AS ne_repond_pas,
          COUNT(CASE WHEN status = 'nouveau' THEN 1 END)::int AS nouveaux,
          COUNT(CASE WHEN status = 'refus' THEN 1 END)::int AS refus
        FROM leads l ${where}
      `, values),

      // Activité des 30 derniers jours
      query(`
        SELECT
          DATE(l.created_at) AS date,
          COUNT(*)::int AS count
        FROM leads l
        WHERE l.created_at >= NOW() - INTERVAL '30 days'
        ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
        GROUP BY DATE(l.created_at)
        ORDER BY date ASC
      `, values),
    ]);

    // Restructurer les stats par agent
    const agentMap = {};
    for (const row of byAgent.rows) {
      const key = row.agent_id || 'unassigned';
      if (!agentMap[key]) {
        agentMap[key] = {
          agent_id: row.agent_id,
          agent_name: row.agent_name || 'Non assigné',
          statuts: {},
          total: 0,
        };
      }
      agentMap[key].statuts[row.status] = row.count;
      agentMap[key].total += row.count;
    }

    res.json({
      totals: totals.rows[0],
      by_status: byStatus.rows,
      by_agent: Object.values(agentMap),
      by_source: bySource.rows,
      activity: recentActivity.rows,
    });
  } catch (err) {
    console.error('[STATS]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getStats };
