-- ─────────────────────────────────────────────────────────────────
-- CheckYourDrip — Tables supplémentaires à créer dans Supabase
-- Exécuter dans : Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- 1. Push subscriptions (abonnements navigateurs)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL PRIMARY KEY,
    endpoint   TEXT UNIQUE NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Paramètres de notification (une seule ligne)
CREATE TABLE IF NOT EXISTS notification_settings (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    email_addresses  TEXT[]  DEFAULT '{}',
    email_enabled    BOOLEAN DEFAULT FALSE,
    min_confidence   FLOAT   DEFAULT 0.5,
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer la ligne de config par défaut
INSERT INTO notification_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Activer le Realtime sur la table detections
-- (à faire aussi dans Supabase → Database → Replication)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE detections REPLICA IDENTITY FULL;

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security (optionnel mais recommandé)
-- Décommenter si tu veux restreindre l'accès
-- ─────────────────────────────────────────────────────────────────
-- ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon read" ON detections FOR SELECT TO anon USING (true);
-- ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
