const { query } = require('../config/database');

/**
 * Enregistre un événement de sécurité dans la table security_logs.
 * Ne lève jamais d'exception — la journalisation ne doit jamais planter le serveur.
 *
 * @param {string} eventType  - 'login_success' | 'login_failed' | 'ip_blocked' |
 *                              'lead_deleted' | 'user_modified' | 'user_deactivated'
 * @param {object} ctx        - { ip, userId, username, details }
 */
async function logEvent(eventType, { ip, userId, username, details } = {}) {
  try {
    await query(
      `INSERT INTO security_logs (event_type, ip, user_id, username, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        eventType,
        ip     || null,
        userId || null,
        username ? String(username).substring(0, 100) : null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch {
    // Silencieux — la table n'existe peut-être pas encore ou le DB est en mock
  }
}

module.exports = { logEvent };
