-- CRM Télépro - Schéma PostgreSQL
-- Exécuter : psql -U postgres -f schema.sql

CREATE DATABASE crm_telepro;
\c crm_telepro;

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM ('admin', 'agent');

-- Statuts des leads
CREATE TYPE lead_status AS ENUM (
  'nouveau',
  'en_cours',
  'transforme',
  'rappel',
  'ne_repond_pas',
  'refus',
  'invalide'
);

-- ============================================================
-- TABLE : users
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        user_role NOT NULL DEFAULT 'agent',
  full_name   VARCHAR(100),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : groups (groupes de leads / campagnes)
-- ============================================================
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : leads
-- ============================================================
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  address       TEXT,
  city          VARCHAR(100),
  postal_code   VARCHAR(20),
  phone         VARCHAR(30),
  phone_normalized VARCHAR(20),   -- format E.164 normalisé pour dédoublonnage
  email         VARCHAR(255),
  email_lower   VARCHAR(255),     -- email en minuscules pour dédoublonnage
  status        lead_status NOT NULL DEFAULT 'nouveau',
  source        VARCHAR(100),
  comment       TEXT,
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  callback_at   TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la recherche et le dédoublonnage
CREATE INDEX idx_leads_phone_normalized ON leads(phone_normalized);
CREATE INDEX idx_leads_email_lower ON leads(email_lower);
CREATE INDEX idx_leads_group_id ON leads(group_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Index full-text pour la recherche
CREATE INDEX idx_leads_search ON leads USING gin(
  to_tsvector('french',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(email, '') || ' ' ||
    COALESCE(phone, '') || ' ' ||
    COALESCE(city, '')
  )
);

-- ============================================================
-- TABLE : lead_history (historique complet des modifications)
-- ============================================================
CREATE TABLE lead_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'status_changed', 'comment_added', 'call_made'
  field       VARCHAR(100),          -- champ modifié
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_history_lead_id ON lead_history(lead_id);
CREATE INDEX idx_history_created_at ON lead_history(created_at);

-- ============================================================
-- TABLE : import_logs (traçabilité des imports CSV)
-- ============================================================
CREATE TABLE import_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID REFERENCES groups(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  filename        VARCHAR(255),
  total_rows      INTEGER DEFAULT 0,
  imported        INTEGER DEFAULT 0,
  duplicates      INTEGER DEFAULT 0,
  errors          INTEGER DEFAULT 0,
  error_details   JSONB,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FONCTION : mise à jour automatique de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONNÉES INITIALES : admin par défaut
-- Mot de passe : Admin1234! (à changer impérativement)
-- Hash bcrypt généré avec 10 rounds
-- ============================================================
INSERT INTO users (username, email, password, role, full_name)
VALUES (
  'admin',
  'admin@crm-telepro.fr',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'Administrateur'
);
