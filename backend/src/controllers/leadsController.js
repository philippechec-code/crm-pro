const { query, pool }    = require('../config/database');
const { normalizePhone } = require('../utils/phoneNormalizer');
const { parseCSV }       = require('../utils/csvParser');
const { logEvent }       = require('../middleware/securityLogger');
const clientIP           = require('../utils/clientIP');

const VALID_STATUSES = ['nouveau', 'en_cours', 'transforme', 'rappel', 'ne_repond_pas', 'refus', 'invalide'];

// ─── LIST ────────────────────────────────────────────────────────────────────
const listLeads = async (req, res) => {
  try {
    const {
      group_id, status, source, assigned_to,
      search, date_from, date_to,
      page = 1, limit = 50,
      sort_by = 'created_at', sort_dir = 'DESC',
    } = req.query;

    const conditions = [];
    const values = [];
    let i = 1;

    if (group_id) { conditions.push(`l.group_id = $${i++}`); values.push(group_id); }
    if (status) { conditions.push(`l.status = $${i++}`); values.push(status); }
    if (source) { conditions.push(`l.source ILIKE $${i++}`); values.push(`%${source}%`); }
    if (assigned_to) { conditions.push(`l.assigned_to = $${i++}`); values.push(assigned_to); }
    if (date_from) { conditions.push(`l.created_at >= $${i++}`); values.push(date_from); }
    if (date_to) { conditions.push(`l.created_at <= $${i++}`); values.push(date_to); }

    // Agents ne voient que leurs leads
    if (req.user.role === 'agent') {
      conditions.push(`(l.assigned_to = $${i++} OR l.assigned_to IS NULL)`);
      values.push(req.user.id);
    }

    if (search) {
      conditions.push(`to_tsvector('french', COALESCE(l.first_name,'') || ' ' || COALESCE(l.last_name,'') || ' ' || COALESCE(l.email,'') || ' ' || COALESCE(l.phone,'') || ' ' || COALESCE(l.city,'')) @@ plainto_tsquery('french', $${i++})`);
      values.push(search);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const allowedSort = ['created_at', 'last_name', 'first_name', 'status', 'source', 'updated_at'];
    const sortCol = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT l.*, g.name AS group_name,
                u.full_name AS agent_name
         FROM leads l
         LEFT JOIN groups g ON l.group_id = g.id
         LEFT JOIN users u ON l.assigned_to = u.id
         ${where}
         ORDER BY l.${sortCol} ${sortDir}
         LIMIT $${i++} OFFSET $${i++}`,
        [...values, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*)::int FROM leads l ${where}`, values),
    ]);

    res.json({
      leads: dataResult.rows,
      total: countResult.rows[0].count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
    });
  } catch (err) {
    console.error('[LEADS] list:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────
const getLead = async (req, res) => {
  try {
    const [leadRes, historyRes] = await Promise.all([
      query(
        `SELECT l.*, g.name AS group_name, u.full_name AS agent_name
         FROM leads l
         LEFT JOIN groups g ON l.group_id = g.id
         LEFT JOIN users u ON l.assigned_to = u.id
         WHERE l.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT h.*, u.full_name AS user_name
         FROM lead_history h
         LEFT JOIN users u ON h.user_id = u.id
         WHERE h.lead_id = $1
         ORDER BY h.created_at DESC`,
        [req.params.id]
      ),
    ]);

    if (!leadRes.rows[0]) return res.status(404).json({ error: 'Lead introuvable' });
    res.json({ ...leadRes.rows[0], history: historyRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── HELPER : Vérification des doublons ───────────────────────────────────────
const checkDuplicate = async (phoneNorm, emailLower, excludeId = null) => {
  // Vérification doublon par téléphone normalisé
  if (phoneNorm) {
    const phoneQuery = excludeId
      ? 'SELECT id FROM leads WHERE phone_normalized = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM leads WHERE phone_normalized = $1 LIMIT 1';
    const phoneParams = excludeId ? [phoneNorm, excludeId] : [phoneNorm];
    
    const dupPhone = await query(phoneQuery, phoneParams);
    if (dupPhone.rows.length > 0) {
      return { 
        isDuplicate: true, 
        field: 'phone',
        message: 'Un lead avec ce numéro de téléphone existe déjà',
        existing_id: dupPhone.rows[0].id 
      };
    }
  }

  // Vérification doublon par email
  if (emailLower) {
    const emailQuery = excludeId
      ? 'SELECT id FROM leads WHERE email_lower = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM leads WHERE email_lower = $1 LIMIT 1';
    const emailParams = excludeId ? [emailLower, excludeId] : [emailLower];
    
    const dupEmail = await query(emailQuery, emailParams);
    if (dupEmail.rows.length > 0) {
      return { 
        isDuplicate: true, 
        field: 'email',
        message: 'Un lead avec cet email existe déjà',
        existing_id: dupEmail.rows[0].id 
      };
    }
  }

  return { isDuplicate: false };
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
const createLead = async (req, res) => {
  const { first_name, last_name, address, city, postal_code,
          phone, email, status, source, comment, group_id, assigned_to } = req.body;

  const phoneNorm = normalizePhone(phone);
  const emailLower = email ? email.trim().toLowerCase() : null;

  try {
    // ✅ Vérification des doublons avant insertion
    const duplicateCheck = await checkDuplicate(phoneNorm, emailLower);
    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({ 
        error: duplicateCheck.message,
        field: duplicateCheck.field,
        existing_id: duplicateCheck.existing_id 
      });
    }

    const result = await query(
      `INSERT INTO leads (first_name, last_name, address, city, postal_code,
                          phone, phone_normalized, email, email_lower,
                          status, source, comment, group_id, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [first_name, last_name, address, city, postal_code,
       phone, phoneNorm, email, emailLower,
       status || 'nouveau', source, comment, group_id || null, assigned_to || null]
    );

    await query(
      `INSERT INTO lead_history (lead_id, user_id, action, note)
       VALUES ($1, $2, 'created', 'Lead créé manuellement')`,
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[LEADS] create:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
const updateLead = async (req, res) => {
  const { id } = req.params;
  const fields = ['first_name', 'last_name', 'address', 'city', 'postal_code',
                  'phone', 'email', 'status', 'source', 'comment', 'group_id',
                  'assigned_to', 'callback_at'];

  try {
    const current = await query('SELECT * FROM leads WHERE id = $1', [id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Lead introuvable' });

    // ✅ Si téléphone ou email est modifié, vérifier les doublons
    const newPhone = req.body.phone !== undefined ? req.body.phone : current.rows[0].phone;
    const newEmail = req.body.email !== undefined ? req.body.email : current.rows[0].email;
    const phoneNorm = normalizePhone(newPhone);
    const emailLower = newEmail ? newEmail.trim().toLowerCase() : null;

    if (req.body.phone !== undefined || req.body.email !== undefined) {
      const duplicateCheck = await checkDuplicate(phoneNorm, emailLower, id);
      if (duplicateCheck.isDuplicate) {
        return res.status(409).json({ 
          error: duplicateCheck.message,
          field: duplicateCheck.field,
          existing_id: duplicateCheck.existing_id 
        });
      }
    }

    const updates = [];
    const values = [];
    const historyEntries = [];
    let i = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        let newVal = req.body[field];
        const oldVal = current.rows[0][field];

        if (field === 'phone') {
          updates.push(`phone = $${i++}`, `phone_normalized = $${i++}`);
          values.push(newVal, normalizePhone(newVal));
        } else if (field === 'email') {
          updates.push(`email = $${i++}`, `email_lower = $${i++}`);
          values.push(newVal, newVal ? newVal.toLowerCase() : null);
        } else {
          updates.push(`${field} = $${i++}`);
          values.push(newVal);
        }

        if (String(oldVal) !== String(newVal)) {
          historyEntries.push({ field, old_value: String(oldVal || ''), new_value: String(newVal || '') });
        }
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });

    values.push(id);
    const result = await query(
      `UPDATE leads SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      values
    );

    // Enregistrer l'historique
    const action = req.body.status && req.body.status !== current.rows[0].status
      ? 'status_changed' : 'updated';

    for (const entry of historyEntries) {
      await query(
        `INSERT INTO lead_history (lead_id, user_id, action, field, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user.id, action, entry.field, entry.old_value, entry.new_value]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[LEADS] update:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
const deleteLead = async (req, res) => {
  try {
    await query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    await logEvent('lead_deleted', {
      ip: clientIP(req),
      userId: req.user.id,
      username: req.user.username,
      details: { lead_id: req.params.id },
    });
    res.json({ message: 'Lead supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── IMPORT CSV ──────────────────────────────────────────────────────────────
const importCSV = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier CSV requis' });

  const { group_id, source: defaultSource } = req.body;
  const client = await pool.connect();

  try {
    const { records } = await parseCSV(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée valide dans le fichier CSV' });
    }

    await client.query('BEGIN');

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const errorDetails = [];

    for (const record of records) {
      try {
        const phoneNorm = normalizePhone(record.phone);
        const emailLower = record.email ? record.email.toLowerCase() : null;

        // Vérification doublon par téléphone normalisé
        if (phoneNorm) {
          const dupPhone = await client.query(
            'SELECT id FROM leads WHERE phone_normalized = $1 LIMIT 1',
            [phoneNorm]
          );
          if (dupPhone.rows.length > 0) {
            duplicates++;
            continue;
          }
        }

        // Vérification doublon par email
        if (emailLower) {
          const dupEmail = await client.query(
            'SELECT id FROM leads WHERE email_lower = $1 LIMIT 1',
            [emailLower]
          );
          if (dupEmail.rows.length > 0) {
            duplicates++;
            continue;
          }
        }

        const insertResult = await client.query(
          `INSERT INTO leads (first_name, last_name, address, city, postal_code,
                              phone, phone_normalized, email, email_lower,
                              status, source, comment, group_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'nouveau',$10,$11,$12)
           RETURNING id`,
          [
            record.first_name || null, record.last_name || null,
            record.address || null, record.city || null, record.postal_code || null,
            record.phone || null, phoneNorm,
            record.email || null, emailLower,
            record.source || defaultSource || null,
            record.comment || null,
            group_id || null,
          ]
        );

        await client.query(
          `INSERT INTO lead_history (lead_id, user_id, action, note)
           VALUES ($1, $2, 'created', 'Importé via CSV')`,
          [insertResult.rows[0].id, req.user.id]
        );

        imported++;
      } catch (rowErr) {
        errors++;
        errorDetails.push({ row: record, error: rowErr.message });
      }
    }

    // Log de l'import
    await client.query(
      `INSERT INTO import_logs (group_id, user_id, filename, total_rows, imported, duplicates, errors, error_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [group_id || null, req.user.id, req.file.originalname,
       records.length, imported, duplicates, errors, JSON.stringify(errorDetails)]
    );

    await client.query('COMMIT');

    res.json({
      message: `Import terminé : ${imported} ajoutés, ${duplicates} doublons ignorés, ${errors} erreurs`,
      total: records.length,
      imported,
      duplicates,
      errors,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[LEADS] importCSV:', err);
    res.status(500).json({ error: 'Erreur lors de l\'import : ' + err.message });
  } finally {
    client.release();
  }
};

// ─── ADD COMMENT ──────────────────────────────────────────────────────────────
const addComment = async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Commentaire requis' });

  try {
    await query(
      `INSERT INTO lead_history (lead_id, user_id, action, note)
       VALUES ($1, $2, 'comment_added', $3)`,
      [req.params.id, req.user.id, note]
    );
    await query(
      `UPDATE leads SET comment = $1, updated_at = NOW() WHERE id = $2`,
      [note, req.params.id]
    );
    res.json({ message: 'Commentaire ajouté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── SUPPRESSION DES DOUBLONS EXISTANTS ───────────────────────────────────────
const cleanDuplicates = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Supprimer les doublons par téléphone (garde le plus ancien)
    const phoneResult = await client.query(`
      DELETE FROM leads a
      USING leads b
      WHERE a.phone_normalized = b.phone_normalized
        AND a.phone_normalized IS NOT NULL
        AND a.id > b.id
      RETURNING a.id
    `);

    // Supprimer les doublons par email (garde le plus ancien)
    const emailResult = await client.query(`
      DELETE FROM leads a
      USING leads b
      WHERE a.email_lower = b.email_lower
        AND a.email_lower IS NOT NULL
        AND a.id > b.id
      RETURNING a.id
    `);

    await client.query('COMMIT');

    const totalDeleted = phoneResult.rowCount + emailResult.rowCount;

    await logEvent('duplicates_cleaned', {
      ip: clientIP(req),
      userId: req.user.id,
      username: req.user.username,
      details: { 
        phone_duplicates: phoneResult.rowCount,
        email_duplicates: emailResult.rowCount,
        total_deleted: totalDeleted
      },
    });

    res.json({
      message: `Nettoyage terminé : ${totalDeleted} doublons supprimés`,
      phone_duplicates_removed: phoneResult.rowCount,
      email_duplicates_removed: emailResult.rowCount,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[LEADS] cleanDuplicates:', err);
    res.status(500).json({ error: 'Erreur lors du nettoyage : ' + err.message });
  } finally {
    client.release();
  }
};

module.exports = { 
  listLeads, 
  getLead, 
  createLead, 
  updateLead, 
  deleteLead, 
  importCSV, 
  addComment,
  cleanDuplicates  // ✅ Nouvelle fonction pour nettoyer les doublons existants
};
