const express = require('express');
const router = express.Router();
const { listLogs, createLog, clearLogs } = require('../controllers/logsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', listLogs);
router.post('/', createLog);
router.delete('/', requireAdmin, clearLogs);

module.exports = router;
