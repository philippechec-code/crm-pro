const rateLimit = require('express-rate-limit');
const clientIP  = require('../utils/clientIP');

const keyGenerator = (req) => clientIP(req);

/**
 * Limite générale : 100 requêtes / minute / IP
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes. Veuillez réessayer dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

/**
 * Limite login : 5 tentatives / 15 min / IP
 * Les requêtes réussies ne comptent pas.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion. Accès bloqué pendant 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator,
});

module.exports = { generalLimiter, loginLimiter };
