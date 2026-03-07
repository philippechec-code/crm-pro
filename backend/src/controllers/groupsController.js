const { query } = require('../config/database');

const listGroups = async (req, res) => {
  try {
    const result = await query(`
      SELECT g.*, u.full_name AS creator_name,
             COUNT(l.id)::int AS lead_count
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN leads l ON l.group_id = g.id
      GROUP BY g.id, u.full_name
      ORDER BY g.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getGroup = async (req, res) => {
  try {
    const result = await query(
      `SELECT g.*, u.full_name AS creator_name,
              COUNT(l.id)::int AS lead_count
       FROM groups g
       LEFT JOIN users u ON g.created_by = u.id
       LEFT JOIN leads l ON l.group_id = g.id
       WHERE g.id = $1
       GROUP BY g.id, u.full_name`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Groupe introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createGroup = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom du groupe requis' });

  try {
    const result = await query(
      `INSERT INTO groups (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), description || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateGroup = async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await query(
      `UPDATE groups SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name || null, description !== undefined ? description : null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Groupe introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Groupe supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { listGroups, getGroup, createGroup, updateGroup, deleteGroup };
