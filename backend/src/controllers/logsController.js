const pool = require('../config/database');

exports.listLogs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM login_logs ORDER BY logged_at DESC LIMIT 500'
    );
    res.json(rows);
  } catch (err) {
    console.error('listLogs error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.createLog = async (req, res) => {
  try {
    const { user_id, user_name, user_email, user_role, browser, os, user_agent } = req.body;
    
    const { rows } = await pool.query(
      `INSERT INTO login_logs (user_id, user_name, user_email, user_role, browser, os, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, user_name, user_email, user_role, browser, os, user_agent]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createLog error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.clearLogs = async (req, res) => {
  try {
    await pool.query('DELETE FROM login_logs');
    res.json({ success: true });
  } catch (err) {
    console.error('clearLogs error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
