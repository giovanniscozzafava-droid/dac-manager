-- Aggiungi colonna descrizione a parafarmacia_cassa
-- Esegui manualmente nella console SQL di Supabase

ALTER TABLE parafarmacia_cassa
  ADD COLUMN IF NOT EXISTS descrizione text;
