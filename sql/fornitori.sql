-- ═══════════════════════════════════════════════════════════
-- Fornitori — tabella anagrafica + collegamento inventario
-- ═══════════════════════════════════════════════════════════
-- Esegui manualmente nella console SQL di Supabase

CREATE TABLE IF NOT EXISTS fornitori (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  partita_iva text,
  telefono text,
  email text,
  indirizzo text,
  citta text,
  categoria text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS fornitore_id uuid REFERENCES fornitori(id);

ALTER TABLE inventario_parafarmacia
  ADD COLUMN IF NOT EXISTS fornitore_id uuid REFERENCES fornitori(id);
