-- =====================================================================
-- DAC — Tag source sui trigger esistenti + view billable (Fase 0.1)
-- Richiede: sql/integrations_foundation.sql già applicato
-- =====================================================================

-- Backfill provenance dove assente
UPDATE ricavi SET source_system = 'dac', invoice_status = COALESCE(invoice_status, 'none')
WHERE source_system IS NULL;

UPDATE ricavi SET source_system = 'agenda'
WHERE source_system = 'dac' AND appuntamento_id IS NOT NULL;

UPDATE ricavi SET source_system = 'pharmacy'
WHERE (source_system IS NULL OR source_system = 'dac')
  AND (codice LIKE 'PF-%' OR reparto = 'Parafarmacia')
  AND appuntamento_id IS NULL;

UPDATE costi SET source_system = COALESCE(source_system, 'dac')
WHERE source_system IS NULL;

UPDATE costi SET source_system = 'pharmacy'
WHERE trigger_da = 'parafarmacia_cassa';

UPDATE costi SET source_system = 'presidio'
WHERE categoria = 'Consumo Presidio' AND (source_system IS NULL OR source_system = 'dac');

-- View lettura unificata per report / futura coda fatture
CREATE OR REPLACE VIEW v_billable_events AS
SELECT
  r.id,
  r.data AS occurred_on,
  r.created_at AS occurred_at,
  r.paziente_id,
  r.paziente_nome,
  r.servizio_nome,
  r.reparto,
  r.importo AS gross,
  r.imponibile AS net,
  r.aliquota_iva AS vat_rate,
  r.iva AS vat_amount,
  COALESCE(r.source_system, 'dac') AS source_system,
  r.source_external_id,
  COALESCE(r.invoice_status, 'none') AS invoice_status,
  r.invoice_external_id,
  r.appuntamento_id,
  r.codice,
  r.metodo,
  r.note,
  'revenue'::text AS direction
FROM ricavi r;

COMMENT ON VIEW v_billable_events IS 'Proiezione ricavi come billable events (hub fatturazione futura)';

-- Indici utili post-colonne
CREATE INDEX IF NOT EXISTS idx_ricavi_source_system ON ricavi (source_system);
CREATE INDEX IF NOT EXISTS idx_ricavi_invoice_status ON ricavi (invoice_status);
CREATE INDEX IF NOT EXISTS idx_costi_source_system ON costi (source_system);

-- Tag provenance nei trigger (richiede colonne da integrations_foundation.sql)
CREATE OR REPLACE FUNCTION public.fn_ricavo_auto_appuntamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_attivo boolean;
  v_prezzo numeric;
  v_reparto text;
  v_exists boolean;
BEGIN
  IF NEW.stato != 'Completato' THEN RETURN NEW; END IF;
  IF OLD.stato = 'Completato' THEN RETURN NEW; END IF;

  SELECT attivo INTO v_attivo
  FROM automazioni
  WHERE id IN ('cb_ricavo_auto', 'ricavo_da_agenda')
    AND attivo = true
  LIMIT 1;
  IF v_attivo IS NOT TRUE THEN RETURN NEW; END IF;

  SELECT EXISTS(
    SELECT 1 FROM ricavi WHERE appuntamento_id = NEW.id
  ) INTO v_exists;
  IF v_exists THEN RETURN NEW; END IF;

  v_prezzo := COALESCE(NEW.importo, 0);
  IF v_prezzo = 0 THEN
    SELECT prezzo INTO v_prezzo FROM servizi WHERE id = NEW.servizio_id;
  END IF;
  IF COALESCE(v_prezzo, 0) = 0 THEN RETURN NEW; END IF;

  SELECT reparto INTO v_reparto FROM servizi WHERE id = NEW.servizio_id;

  INSERT INTO ricavi (
    codice, data, paziente_id, paziente_nome, servizio_nome, reparto,
    operatore_nome, importo, metodo, appuntamento_id, note,
    source_system, invoice_status
  ) VALUES (
    'RIC-' || to_char(NOW(), 'YYMMDDHH24MISS'),
    NEW.data,
    NEW.paziente_id,
    COALESCE(NEW.paziente_nome, ''),
    COALESCE(NEW.servizio_nome, ''),
    COALESCE(v_reparto, ''),
    COALESCE(NEW.operatore_nome, ''),
    v_prezzo,
    COALESCE(NEW.metodo_pagamento::text, 'Non specificato'),
    NEW.id,
    'Auto da app#' || NEW.id::text,
    'agenda',
    'none'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_parafarmacia_mirror()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.tipo = 'Entrata' THEN
    INSERT INTO ricavi (
      codice, data, servizio_nome, reparto, operatore_nome,
      importo, metodo, note, imponibile, aliquota_iva, iva,
      source_system, invoice_status
    ) VALUES (
      'PF-' || to_char(NEW.created_at, 'YYMMDDHH24MISS'),
      NEW.data,
      COALESCE(NEW.descrizione, 'Vendita Parafarmacia'),
      'Parafarmacia',
      NEW.operatore_nome,
      NEW.importo,
      NEW.metodo,
      NEW.note,
      NEW.imponibile,
      NEW.aliquota_iva,
      NEW.iva,
      'pharmacy',
      'none'
    );
  ELSIF NEW.tipo = 'Uscita' THEN
    INSERT INTO costi (
      codice, data, categoria, descrizione, importo, metodo, note, trigger_da,
      imponibile, aliquota_iva, iva, source_system
    ) VALUES (
      'PF-' || to_char(NEW.created_at, 'YYMMDDHH24MISS'),
      NEW.data,
      'Forniture mediche',
      COALESCE(NEW.descrizione, 'Acquisto Parafarmacia'),
      NEW.importo,
      NEW.metodo,
      NEW.note,
      'parafarmacia_cassa',
      NEW.imponibile,
      NEW.aliquota_iva,
      NEW.iva,
      'pharmacy'
    );
  END IF;
  RETURN NEW;
END;
$function$;
