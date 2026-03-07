const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getStats);

module.exports = router;
