/**
 * Extrait l'IP réelle du client (gère les reverse proxies via X-Forwarded-For)
 */
module.exports = function clientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
};
