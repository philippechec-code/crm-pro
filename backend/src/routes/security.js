const express = require('express');
const router  = express.Router();
const {
  listIPs, addIP, updateIP, deleteIP, getMyIP, getLogs,
} = require('../controllers/securityController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Toutes les routes de sécurité sont réservées aux admins authentifiés
router.use(authenticate, requireAdmin);

// ── Mon IP (retourne l'IP du client appelant) ─────────────────────────────────
router.get('/myip', getMyIP);

// ── Whitelist IP ──────────────────────────────────────────────────────────────
router.get   ('/ips',     listIPs);
router.post  ('/ips',     addIP);
router.put   ('/ips/:id', updateIP);
router.delete('/ips/:id', deleteIP);

// ── Logs de sécurité ──────────────────────────────────────────────────────────
router.get('/logs', getLogs);

module.exports = router;
