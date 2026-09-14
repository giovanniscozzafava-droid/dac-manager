-- =====================================================================
-- DAC Manager — Fondamenta integrazioni (Fase 0)
-- Eseguire su Supabase SQL Editor dopo review.
-- Non modifica tabelle operative esistenti; solo infrastruttura sync.
-- =====================================================================

-- Connessioni configurate (secret NON qui: solo metadata + stato)
CREATE TABLE IF NOT EXISTS integration_connections (
  id TEXT PRIMARY KEY,                 -- es. 'lab_main', 'fic_produzione'
  system TEXT NOT NULL CHECK (system IN ('lab', 'clinic', 'pharmacy', 'invoicing', 'email')),
  display_name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (status IN ('disabled', 'configured', 'active', 'error')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- non-secret: company_id, base_url pubblica, scopes
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mapping ID locali ↔ esterni
CREATE TABLE IF NOT EXISTS integration_external_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT NOT NULL CHECK (system IN ('lab', 'clinic', 'pharmacy', 'invoicing', 'email')),
  entity_type TEXT NOT NULL,           -- patient | appointment | order | invoice | product | sale
  local_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system, entity_type, local_id),
  UNIQUE (system, entity_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_ext_local
  ON integration_external_ids (system, entity_type, local_id);
CREATE INDEX IF NOT EXISTS idx_integration_ext_external
  ON integration_external_ids (system, entity_type, external_id);

-- Outbox: comandi/eventi da inviare agli adapter
CREATE TABLE IF NOT EXISTS integration_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT NOT NULL CHECK (system IN ('lab', 'clinic', 'pharmacy', 'invoicing', 'email')),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID,
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (system, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_integration_outbox_drain
  ON integration_outbox (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- Inbox: eventi inbound (webhook) già applicati
CREATE TABLE IF NOT EXISTS integration_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT NOT NULL CHECK (system IN ('lab', 'clinic', 'pharmacy', 'invoicing', 'email')),
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'applied', 'ignored', 'error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  UNIQUE (system, idempotency_key)
);

-- Seed connessioni (disabilitate) — i secret si configurano in Edge env
INSERT INTO integration_connections (id, system, display_name, environment, status, config) VALUES
  ('lab_main', 'lab', 'Laboratorio analisi', 'sandbox', 'disabled', '{"role":"LIS","notes":"Accettazione esami e referti"}'::jsonb),
  ('clinic_main', 'clinic', 'Gestionale cliniche', 'sandbox', 'disabled', '{"role":"EHR/agenda","notes":"Cartella e visite"}'::jsonb),
  ('pharmacy_main', 'pharmacy', 'Gestionale parafarmacia', 'sandbox', 'disabled', '{"role":"POS/magazzino","notes":"SoT vendite e stock"}'::jsonb),
  ('invoicing_fic', 'invoicing', 'Fatture in Cloud', 'sandbox', 'disabled', '{"provider":"fattureincloud","api":"v2"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_inbox ENABLE ROW LEVEL SECURITY;

-- Policy: solo authenticated (allineato al resto del progetto).
-- I worker Edge useranno service role (bypass RLS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_connections' AND policyname = 'integration_connections_auth'
  ) THEN
    CREATE POLICY integration_connections_auth ON integration_connections
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_external_ids' AND policyname = 'integration_external_ids_auth'
  ) THEN
    CREATE POLICY integration_external_ids_auth ON integration_external_ids
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_outbox' AND policyname = 'integration_outbox_auth'
  ) THEN
    CREATE POLICY integration_outbox_auth ON integration_outbox
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_inbox' AND policyname = 'integration_inbox_auth'
  ) THEN
    CREATE POLICY integration_inbox_auth ON integration_inbox
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Estensione opzionale ledger esistente (idempotente se colonne già presenti)
ALTER TABLE ricavi ADD COLUMN IF NOT EXISTS source_system TEXT;
ALTER TABLE ricavi ADD COLUMN IF NOT EXISTS source_external_id TEXT;
ALTER TABLE ricavi ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'none';
ALTER TABLE ricavi ADD COLUMN IF NOT EXISTS invoice_external_id TEXT;

ALTER TABLE costi ADD COLUMN IF NOT EXISTS source_system TEXT;
ALTER TABLE costi ADD COLUMN IF NOT EXISTS source_external_id TEXT;

COMMENT ON TABLE integration_outbox IS 'Coda comandi/eventi verso lab, clinica, parafarmacia, fatturazione';
COMMENT ON TABLE integration_external_ids IS 'Mappa UUID DAC ↔ ID sistemi esterni';
