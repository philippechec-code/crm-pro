const express = require('express');
const router  = express.Router();
const { login, me, changePassword } = require('../controllers/authController');
const { authenticate }  = require('../middleware/auth');
const { loginLimiter }  = require('../middleware/rateLimiter');

// Rate limit : 5 tentatives / 15 min / IP (requêtes réussies non comptées)
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
