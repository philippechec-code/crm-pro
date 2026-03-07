/**
 * Middleware de sanitisation des entrées.
 * - Supprime les octets nuls (\0) qui pourraient perturber certains parseurs
 * - Trim les chaînes de caractères
 * S'applique sur req.body et req.query.
 * La protection SQL injection est déjà assurée par les requêtes paramétrées.
 */
function clean(val) {
  if (typeof val === 'string') return val.replace(/\0/g, '').trim();
  if (Array.isArray(val))      return val.map(clean);
  if (val && typeof val === 'object') {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, clean(v)]));
  }
  return val;
}

module.exports = (req, _res, next) => {
  if (req.body)  req.body  = clean(req.body);
  if (req.query) req.query = clean(req.query);
  next();
};
