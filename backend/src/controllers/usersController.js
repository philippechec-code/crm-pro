const bcrypt       = require('bcryptjs');
const { query }    = require('../config/database');
const { logEvent } = require('../middleware/securityLogger');
const clientIP     = require('../utils/clientIP');

const listUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, full_name, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createUser = async (req, res) => {
  const { username, email, password, role, full_name } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email et mot de passe requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (username, email, password, role, full_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, full_name, active, created_at`,
      [username.trim(), email.trim().toLowerCase(), hashed, role || 'agent', full_name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet identifiant ou email existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, role, active, password } = req.body;

  try {
    const updates = [];
    const values = [];
    let i = 1;

    if (full_name !== undefined) { updates.push(`full_name = $${i++}`); values.push(full_name); }
    if (role !== undefined) { updates.push(`role = $${i++}`); values.push(role); }
    if (active !== undefined) { updates.push(`active = $${i++}`); values.push(active); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password = $${i++}`);
      values.push(hashed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, username, email, role, full_name, active`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    await logEvent('user_modified', {
      ip: clientIP(req),
      userId: req.user.id,
      username: req.user.username,
      details: { target_user_id: id, fields: Object.keys(req.body).filter(k => k !== 'password') },
    });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  try {
    await query('UPDATE users SET active = false WHERE id = $1', [id]);
    await logEvent('user_deactivated', {
      ip: clientIP(req),
      userId: req.user.id,
      username: req.user.username,
      details: { target_user_id: id },
    });
    res.json({ message: 'Utilisateur désactivé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };
