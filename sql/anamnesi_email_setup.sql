-- ═══════════════════════════════════════════════════════════
-- Workflow invio anamnesi allo specialista via email (PDF)
-- ═══════════════════════════════════════════════════════════
-- Eseguire nell'SQL editor di Supabase.

-- 1. Colonna email_referti sulla tabella specialisti
ALTER TABLE specialisti
  ADD COLUMN IF NOT EXISTS email_referti text;

COMMENT ON COLUMN specialisti.email_referti IS
  'Email dedicata ricezione referti/anamnesi. Fallback: specialisti.email';

-- 2. Tabella di log invii (best-effort dall''edge function)
CREATE TABLE IF NOT EXISTS anamnesi_log (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  anamnesi_id  uuid         NOT NULL REFERENCES anamnesi(id) ON DELETE CASCADE,
  tipo         text         NOT NULL,
  destinatario text,
  messaggio    text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anamnesi_log_anamnesi
  ON anamnesi_log(anamnesi_id);

-- 3. Storage bucket per i PDF anamnesi
INSERT INTO storage.buckets (id, name, public)
VALUES ('anamnesi-docs', 'anamnesi-docs', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 4. Policy bucket: upload + read per utenti autenticati; read pubblica firmata/URL pubblico
--    (bucket pubblico per consentire all''edge function di fetch-are il PDF)
DO $$ BEGIN
  CREATE POLICY "anamnesi_docs_insert_auth"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'anamnesi-docs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anamnesi_docs_update_auth"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'anamnesi-docs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anamnesi_docs_select_public"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'anamnesi-docs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anamnesi_docs_delete_auth"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'anamnesi-docs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Sanity check colonne anamnesi (presenti dal setup iniziale, qui solo per sicurezza)
ALTER TABLE anamnesi
  ADD COLUMN IF NOT EXISTS email_inviata boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doc_url       text;
