require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');

const { generalLimiter }  = require('./src/middleware/rateLimiter');
const sanitize             = require('./src/middleware/sanitize');
const { ipWhitelist }      = require('./src/middleware/ipWhitelist');

const authRoutes     = require('./src/routes/auth');
const leadsRoutes    = require('./src/routes/leads');
const groupsRoutes   = require('./src/routes/groups');
const statsRoutes    = require('./src/routes/stats');
const usersRoutes    = require('./src/routes/users');
const securityRoutes = require('./src/routes/security');
const remindersRoutes = require('./src/routes/reminders');
const logsRoutes = require('./src/routes/logs');

// Valeurs par défaut pour le développement local
process.env.JWT_SECRET     = process.env.JWT_SECRET     || 'dev-secret-change-me';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
process.env.FRONTEND_URL   = process.env.FRONTEND_URL   || 'http://localhost:5175';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Trust proxy (Nginx, Cloudflare, etc.) ─────────────────────────────────────
app.set('trust proxy', 1);

// ── Headers de sécurité (Helmet) ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting général (100 req/min/IP) ────────────────────────────────────
app.use(generalLimiter);

// ── Parsing du corps ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Sanitisation des entrées ──────────────────────────────────────────────────
app.use(sanitize);

// ── Whitelist IP (avant les routes métier) ────────────────────────────────────
app.use(ipWhitelist);

// ── Fichiers uploadés ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/leads',    leadsRoutes);
app.use('/api/groups',   groupsRoutes);
app.use('/api/stats',    statsRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/logs', logsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Gestionnaire d'erreurs global ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux (max 10MB)' });
  }
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne',
  });
});

app.listen(PORT, () => {
  console.log(`✓ CRM Télépro API démarrée sur http://localhost:${PORT}`);
});
