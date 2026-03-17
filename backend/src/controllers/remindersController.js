const pool = require('../config/database');

exports.listReminders = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const query = userId 
      ? 'SELECT * FROM reminders WHERE agent_id = $1 ORDER BY scheduled_at ASC'
      : 'SELECT * FROM reminders ORDER BY scheduled_at ASC';
    const params = userId ? [userId] : [];
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('listReminders error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.createReminder = async (req, res) => {
  try {
    const { lead_id, lead_name, lead_phone, scheduled_at, note } = req.body;
    const agent_id = req.user.id;
    const agent_name = req.user.full_name || req.user.email;
    
    const { rows } = await pool.query(
      `INSERT INTO reminders (lead_id, lead_name, lead_phone, agent_id, agent_name, scheduled_at, note) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [lead_id, lead_name, lead_phone, agent_id, agent_name, scheduled_at, note || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createReminder error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    
    if (keys.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE reminders SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    
    if (!rows.length) return res.status(404).json({ error: 'Rappel non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('updateReminder error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reminders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteReminder error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
