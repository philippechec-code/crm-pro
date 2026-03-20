const { query } = require('../config/database');

// Liste toutes les sources
const list = async (req, res) => {
  try {
    const result = await query('SELECT * FROM sources ORDER BY label');
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur liste sources:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Créer une source
const create = async (req, res) => {
  try {
    const { label, color } = req.body;
    if (!label?.trim()) {
      return res.status(400).json({ error: 'Nom requis' });
    }
    const id = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Vérifier si existe déjà
    const existing = await query('SELECT id FROM sources WHERE id = $1 OR LOWER(label) = LOWER($2)', [id, label.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Cette source existe déjà' });
    }
    
    const result = await query(
      'INSERT INTO sources (id, label, color) VALUES ($1, $2, $3) RETURNING *',
      [id, label.trim(), color || '#60a5fa']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur création source:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Modifier une source
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, color } = req.body;
    
    const fields = [];
    const values = [];
    let i = 1;
    
    if (label) { fields.push(`label = $${i++}`); values.push(label.trim()); }
    if (color) { fields.push(`color = $${i++}`); values.push(color); }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à modifier' });
    }
    
    values.push(id);
    const result = await query(
      `UPDATE sources SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source non trouvée' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur modification source:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Supprimer une source
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mettre à null la source des leads qui l'utilisent
    await query('UPDATE leads SET source = NULL WHERE LOWER(source) = LOWER($1)', [id]);
    
    const result = await query('DELETE FROM sources WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source non trouvée' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression source:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { list, create, update, remove };
