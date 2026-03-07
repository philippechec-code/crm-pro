const { Pool } = require('pg');

// Accepte DATABASE_URL ou les variables individuelles DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
const connectionString = process.env.DATABASE_URL || (() => {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (DB_HOST && DB_NAME && DB_USER) {
    const port = DB_PORT || 5432;
    const pwd  = DB_PASSWORD ? encodeURIComponent(DB_PASSWORD) : '';
    const auth = pwd ? `${DB_USER}:${pwd}` : DB_USER;
    return `postgresql://${auth}@${DB_HOST}:${port}/${DB_NAME}`;
  }
  return null;
})();

if (!connectionString) {
  console.warn('[DB] DATABASE_URL non défini — utilisation d\'un fallback mock (pas de persistence)');

  // Simple mock implementation to allow the server to run without Postgres.
  const mockQuery = async (text, params) => {
    const sql = String(text || '').toUpperCase();
    // Return zero counts for COUNT queries
    if (sql.includes('COUNT(') || sql.includes('COUNT *') || sql.includes('COUNT(*)')) {
      return { rows: [{ count: 0 }], rowCount: 1 };
    }
    // For RETURNING id, simulate an id
    if (sql.includes('RETURNING ID')) {
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    // For generic RETURNING *, return an object with an id and timestamps
    if (sql.includes('RETURNING *')) {
      return { rows: [{ id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], rowCount: 1 };
    }
    // Default empty result
    return { rows: [], rowCount: 0 };
  };

  const mockPool = {
    query: mockQuery,
    connect: async () => ({ query: mockQuery, release: () => {} }),
    end: async () => {},
  };

  module.exports = { pool: mockPool, query: mockQuery };

} else {
  console.log('[DB] Connexion PostgreSQL via', connectionString.replace(/:([^:@]+)@/, ':***@'));
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Erreur inattendue sur le client inactif', err);
  });

  const query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 200) {
        console.warn(`[DB] Requête lente (${duration}ms):`, text.substring(0, 80));
      }
      return res;
    } catch (err) {
      console.error('[DB] Erreur requête:', err.message);
      throw err;
    }
  };

  module.exports = { pool, query };
}
