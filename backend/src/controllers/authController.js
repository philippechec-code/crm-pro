const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { query }    = require('../config/database');
const { logEvent } = require('../middleware/securityLogger');
const clientIP     = require('../utils/clientIP');

const login = async (req, res) => {
  console.log('[AUTH] login invoked, DATABASE_URL=', !!process.env.DATABASE_URL);
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  const ip = clientIP(req);

  // ── Mode dev (sans Postgres) ──────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    try {
      const { findByUsernameOrEmail } = require('../devUsers');
      const dev = findByUsernameOrEmail(username)
               || findByUsernameOrEmail(username?.toLowerCase())
               || findByUsernameOrEmail(username?.trim());
      if (!dev) {
        await logEvent('login_failed', { ip, username, details: { reason: 'user_not_found', mode: 'dev' } });
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
      const valid = await bcrypt.compare(password, dev.passwordHash);
      if (!valid) {
        await logEvent('login_failed', { ip, username, details: { reason: 'bad_password', mode: 'dev' } });
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
      const devUser = { id: dev.id, username: dev.username, email: dev.email, role: dev.role, full_name: dev.full_name };
      const token   = jwt.sign(devUser, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
      await logEvent('login_success', { ip, userId: dev.id, username: dev.username });
      return res.json({ token, user: devUser });
    } catch (err) {
      console.error('[AUTH] dev login error:', err);
      return res.status(500).json({ error: 'Erreur serveur (dev login)' });
    }
  }

  // ── Mode production (Postgres) ────────────────────────────────────────────
  try {
    const result = await query(
      'SELECT id, username, email, password, role, full_name, active FROM users WHERE (username = $1 OR email = $1)',
      [username.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      await logEvent('login_failed', { ip, username, details: { reason: 'user_not_found' } });
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    if (!user.active) {
      await logEvent('login_failed', { ip, username, details: { reason: 'account_inactive' } });
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await logEvent('login_failed', { ip, username, details: { reason: 'bad_password' } });
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await logEvent('login_success', { ip, userId: user.id, username: user.username });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, full_name: user.full_name },
    });
  } catch (err) {
    console.error('[AUTH] login:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const me = async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({
      id: req.user.id, username: req.user.username,
      role: req.user.role, full_name: req.user.full_name,
      email: req.user.email || `${req.user.username}@local`,
    });
  }
  try {
    const result = await query(
      'SELECT id, username, email, role, full_name, created_at FROM users WHERE id = $1 AND active = true',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Anciens et nouveaux mots de passe requis' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }
  try {
    if (!process.env.DATABASE_URL) {
      return res.json({ message: 'Mot de passe modifié (mode dev)' });
    }
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user   = result.rows[0];
    const valid  = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { login, me, changePassword };
