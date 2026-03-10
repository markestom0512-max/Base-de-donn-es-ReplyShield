-- ============================================================
--  ReplyShield — Schéma Supabase
--  Exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- ── Table : contacts (formulaire de contact général)
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  name        TEXT        NOT NULL,
  company     TEXT,
  email       TEXT        NOT NULL,
  service     TEXT,
  message     TEXT,
  status      TEXT        DEFAULT 'nouveau'
                          CHECK (status IN ('nouveau', 'en_cours', 'traite')),
  notes       TEXT
);

-- ── Table : devis (demandes de devis détaillées)
CREATE TABLE IF NOT EXISTS devis (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  name         TEXT        NOT NULL,
  company      TEXT,
  email        TEXT        NOT NULL,
  phone        TEXT,
  service_type TEXT,
  budget       TEXT,
  description  TEXT,
  status       TEXT        DEFAULT 'nouveau'
                           CHECK (status IN ('nouveau', 'en_cours', 'traite')),
  notes        TEXT
);

-- ============================================================
--  Row Level Security
-- ============================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis    ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut insérer (formulaires publics)
CREATE POLICY "contacts_insert_public"
  ON contacts FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "devis_insert_public"
  ON devis FOR INSERT TO anon
  WITH CHECK (true);

-- Seuls les admins authentifiés peuvent tout faire
CREATE POLICY "contacts_admin_all"
  ON contacts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "devis_admin_all"
  ON devis FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
--  Index utiles pour les tris admin
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status     ON contacts (status);
CREATE INDEX IF NOT EXISTS idx_devis_created_at    ON devis    (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devis_status        ON devis    (status);
