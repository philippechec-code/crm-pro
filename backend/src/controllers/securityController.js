const { query }           = require('../config/database');
const { invalidateCache } = require('../middleware/ipWhitelist');
const clientIP            = require('../utils/clientIP');

// ── Helpers ───────────────────────────────────────────────────────────────────
const IPV4_CIDR = /^(\d{1,3}\.){3}\d{1,3}(\/([0-9]|[12]\d|3[012]))?$/;

const EVENT_TYPES = [
  'login_success', 'login_failed', 'ip_blocked',
  'lead_deleted', 'user_modified', 'user_deactivated',
];

// ── IP Whitelist ──────────────────────────────────────────────────────────────

const listIPs = async (req, res) => {
  try {
    const result = await query(
      `SELECT w.id, w.ip_address, w.description, w.actif, w.created_at,
              u.full_name AS created_by_name
       FROM ip_whitelist w
       LEFT JOIN users u ON w.created_by = u.id
       ORDER BY w.created_at DESC`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const addIP = async (req, res) => {
  const { ip, description } = req.body;
  if (!ip?.trim()) return res.status(400).json({ error: 'Adresse IP requise' });

  const ipTrimmed = ip.trim();
  if (!IPV4_CIDR.test(ipTrimmed)) {
    return res.status(400).json({
      error: 'Format invalide. Exemples valides : 192.168.1.1  ou  192.168.1.0/24',
    });
  }

  try {
    const result = await query(
      `INSERT INTO ip_whitelist (ip_address, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ipTrimmed, description?.trim() || null, req.user.id]
    );
    invalidateCache();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cette IP est déjà dans la whitelist' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateIP = async (req, res) => {
  const { id } = req.params;
  const { description, actif } = req.body;

  const updates = [];
  const values  = [];
  let i = 1;

  if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
  if (actif       !== undefined) { updates.push(`actif = $${i++}`);       values.push(actif); }

  if (!updates.length) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });

  values.push(id);
  try {
    const result = await query(
      `UPDATE ip_whitelist SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Entrée introuvable' });
    invalidateCache();
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteIP = async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM ip_whitelist WHERE id = $1 RETURNING ip_address',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Entrée introuvable' });
    invalidateCache();
    res.json({ message: `IP ${result.rows[0].ip_address} supprimée de la whitelist` });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Mon IP ────────────────────────────────────────────────────────────────────

const getMyIP = (req, res) => {
  res.json({ ip: clientIP(req) });
};

// ── Security Logs ─────────────────────────────────────────────────────────────

const getLogs = async (req, res) => {
  try {
    const { event_type, ip, username, date_from, date_to, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const values     = [];
    let i = 1;

    if (event_type && EVENT_TYPES.includes(event_type)) {
      conditions.push(`event_type = $${i++}`);
      values.push(event_type);
    }
    if (ip) {
      conditions.push(`ip = $${i++}`);
      values.push(ip.trim());
    }
    if (username) {
      conditions.push(`username ILIKE $${i++}`);
      values.push(`%${username.trim()}%`);
    }
    if (date_from) {
      conditions.push(`created_at >= $${i++}`);
      values.push(date_from);
    }
    if (date_to) {
      conditions.push(`created_at < $${i++}`);
      // Include the full end day
      const end = new Date(date_to);
      end.setDate(end.getDate() + 1);
      values.push(end.toISOString().split('T')[0]);
    }

    const where    = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const limitInt  = Math.min(parseInt(limit)  || 50, 500);
    const offsetInt = parseInt(offset) || 0;

    const [logsRes, countRes] = await Promise.all([
      query(
        `SELECT * FROM security_logs ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        [...values, limitInt, offsetInt]
      ),
      query(`SELECT COUNT(*)::int FROM security_logs ${where}`, values),
    ]);

    res.json({ logs: logsRes.rows, total: countRes.rows[0].count });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { listIPs, addIP, updateIP, deleteIP, getMyIP, getLogs };
