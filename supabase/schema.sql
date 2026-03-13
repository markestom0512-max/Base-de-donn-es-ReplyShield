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

-- ============================================================
--  Service de réponse automatique aux avis Google
-- ============================================================

-- ── Table : clients (abonnés ReplyShield)
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Infos contact
  name                  TEXT        NOT NULL,
  company               TEXT        NOT NULL,
  email                 TEXT        NOT NULL UNIQUE,
  phone                 TEXT,
  -- Profil établissement
  sector                TEXT,
  city                  TEXT,
  website               TEXT,
  -- Google Business Profile
  google_account_id     TEXT,        -- ex: "accounts/123456789"
  google_location_id    TEXT,        -- ex: "locations/987654321"
  google_refresh_token  TEXT,        -- OAuth2 refresh token (chiffré en prod)
  google_connected_at   TIMESTAMPTZ,
  -- Abonnement
  plan                  TEXT        DEFAULT 'starter'
                                    CHECK (plan IN ('starter', 'pro', 'business')),
  status                TEXT        DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'actif', 'pause', 'resilie')),
  -- Stats
  total_reviews_answered INT        DEFAULT 0,
  last_sync_at           TIMESTAMPTZ,
  notes                  TEXT
);

-- ── Table : avis_google (avis traités par le service)
CREATE TABLE IF NOT EXISTS avis_google (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Référence client
  client_id       UUID        REFERENCES clients(id) ON DELETE CASCADE,
  -- Données Google
  review_id       TEXT        NOT NULL,  -- ID unique de l'avis Google
  reviewer_name   TEXT,
  reviewer_photo  TEXT,
  rating          INT         CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT,
  review_date     TIMESTAMPTZ,
  -- Réponse générée
  response_text   TEXT,
  responded_at    TIMESTAMPTZ,
  -- Statut du traitement
  status          TEXT        DEFAULT 'nouveau'
                              CHECK (status IN ('nouveau', 'en_attente', 'repondu', 'erreur', 'ignore')),
  error_message   TEXT,
  -- Metadata Claude
  model_used      TEXT,
  prompt_version  TEXT,
  UNIQUE(client_id, review_id)
);

-- ── RLS
ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis_google ENABLE ROW LEVEL SECURITY;

-- Seuls les admins authentifiés peuvent tout faire
CREATE POLICY "clients_admin_all"
  ON clients FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "avis_google_admin_all"
  ON avis_google FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Le service N8N (service_role) peut insérer/mettre à jour les avis
CREATE POLICY "avis_google_service_upsert"
  ON avis_google FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "clients_service_read"
  ON clients FOR SELECT TO service_role
  USING (true);

CREATE POLICY "clients_service_update"
  ON clients FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- ── Index
CREATE INDEX IF NOT EXISTS idx_clients_status        ON clients     (status);
CREATE INDEX IF NOT EXISTS idx_clients_email         ON clients     (email);
CREATE INDEX IF NOT EXISTS idx_avis_client_id        ON avis_google (client_id);
CREATE INDEX IF NOT EXISTS idx_avis_status           ON avis_google (status);
CREATE INDEX IF NOT EXISTS idx_avis_review_date      ON avis_google (review_date DESC);
CREATE INDEX IF NOT EXISTS idx_avis_rating           ON avis_google (rating);
