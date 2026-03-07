const { query }  = require('../config/database');
const { logEvent } = require('./securityLogger');
const clientIP   = require('../utils/clientIP');

// ── Cache en mémoire (TTL 30 s) pour éviter une requête DB à chaque hit ──────
let _cache    = null;
let _cacheTs  = 0;
const CACHE_TTL = 30_000;

// ── Helpers IPv4 CIDR ─────────────────────────────────────────────────────────
function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function ipMatchesCIDR(ip, cidr) {
  if (!cidr.includes('/')) return ip === cidr;
  const [network, bits] = cidr.split('/');
  const prefix = parseInt(bits, 10);
  if (prefix === 0) return true; // 0.0.0.0/0 = tout autoriser
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(network) & mask);
}

// ── Récupération de la whitelist (avec cache) ─────────────────────────────────
async function getActiveIPs() {
  if (_cache !== null && Date.now() - _cacheTs < CACHE_TTL) return _cache;
  try {
    const result = await query('SELECT ip FROM ip_whitelist WHERE actif = true');
    _cache  = result.rows.map(r => r.ip);
    _cacheTs = Date.now();
    return _cache;
  } catch {
    return _cache || []; // fallback sur le cache ou liste vide en cas d'erreur DB
  }
}

/** Invalide le cache après ajout/suppression d'une IP */
function invalidateCache() {
  _cache  = null;
  _cacheTs = 0;
}

// ── Middleware ────────────────────────────────────────────────────────────────
const ipWhitelist = async (req, res, next) => {
  // Ne pas bloquer le health-check (utile pour les sondes de monitoring)
  if (req.path === '/api/health') return next();

  try {
    const whitelist = await getActiveIPs();

    // Whitelist vide → tout le monde est autorisé
    if (whitelist.length === 0) return next();

    const ip = clientIP(req);

    const allowed = whitelist.some(entry => {
      try { return ipMatchesCIDR(ip, entry); } catch { return ip === entry; }
    });

    if (!allowed) {
      await logEvent('ip_blocked', {
        ip,
        details: { method: req.method, path: req.path },
      });
      return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
  } catch (err) {
    // Fail-open : en cas d'erreur interne, on laisse passer plutôt que de bloquer tout le monde
    console.error('[IP_WHITELIST] Erreur middleware:', err.message);
    next();
  }
};

module.exports = { ipWhitelist, invalidateCache };
