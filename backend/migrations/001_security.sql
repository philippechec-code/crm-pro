-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 — Sécurité : whitelist IP + logs de sécurité
-- À exécuter une seule fois sur la base PostgreSQL :
--   psql -U postgres -d crm_telepro -f migrations/001_security.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Whitelist IP ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id          SERIAL      PRIMARY KEY,
  ip          VARCHAR(50) NOT NULL UNIQUE,   -- adresse IPv4 ou plage CIDR (ex: 192.168.1.0/24)
  description TEXT,
  actif       BOOLEAN     NOT NULL DEFAULT true,
  created_by  INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Logs de sécurité ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_logs (
  id          SERIAL      PRIMARY KEY,
  event_type  VARCHAR(50) NOT NULL,          -- login_success | login_failed | ip_blocked |
                                              -- lead_deleted | user_modified | user_deactivated
  ip          VARCHAR(50),
  user_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  username    VARCHAR(100),
  details     JSONB,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sec_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_logs_ip         ON security_logs(ip);
CREATE INDEX IF NOT EXISTS idx_sec_logs_user_id    ON security_logs(user_id);

-- Nettoyage automatique : purger les logs de plus de 90 jours
-- (optionnel, à activer si pg_cron est disponible)
-- SELECT cron.schedule('purge-security-logs', '0 3 * * *',
--   $$DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '90 days'$$);
