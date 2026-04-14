-- ═══════════════════════════════════════════════════════════
-- OPERATORI: campi profilo completo
-- ═══════════════════════════════════════════════════════════

ALTER TABLE operatori ADD COLUMN IF NOT EXISTS settore TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS cognome TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS data_nascita DATE;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS luogo_nascita TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS via TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS cap TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS citta TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS profilo_completo BOOLEAN DEFAULT false;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Disattiva placeholder ma non eliminarli (FK)
UPDATE operatori SET attivo = false, email = NULL WHERE email LIKE '%placeholder.com';
