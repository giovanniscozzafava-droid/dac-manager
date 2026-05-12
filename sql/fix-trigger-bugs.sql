-- =====================================================================
-- DAC Manager — Fix dei trigger rotti (2026-05-12)
-- =====================================================================
-- Cosa sistema questo file:
--
--  1) fn_ricavo_auto_appuntamento (bug #1 del brief, GRAVE)
--     - usava colonne inesistenti: servizio, operatore, metodo_pagamento
--     - colonne corrette: servizio_nome, operatore_nome, metodo
--     - non settava `codice` (NOT NULL) → INSERT falliva comunque
--     - non settava `appuntamento_id` → linking via note LIKE (fragile)
--     CONSEGUENZA: dal lancio del sistema, NESSUN appuntamento si è mai
--     potuto completare (105/105 ancora Prenotato o Confermato).
--
--  2) fn_recall_auto (bug #4 del brief)
--     - usava task.servizio → colonna corretta task.servizio_nome
--     - non settava task.codice (NOT NULL) → INSERT falliva
--     - fallback hardcoded 'V. Crupi': sostituito con NULL (configurabile)
--
--  3) fn_parafarmacia_mirror (bug nuovo A)
--     - INSERT in ricavi/costi senza imponibile, aliquota_iva, iva
--     - ora propaga IVA della cassa parafarmacia al mirror
--
-- Prima di Run: nessuna automazione viene attivata/disattivata. Lo stato
-- di `automazioni.attivo` resta com'è. I dati esistenti non vengono
-- toccati.
-- =====================================================================

-- ----- 1) fn_ricavo_auto_appuntamento ----------------------------------
CREATE OR REPLACE FUNCTION public.fn_ricavo_auto_appuntamento()
 RETURNS trigger
 LANGUAGE plpgsql
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

  -- Idempotenza: se per questo appuntamento esiste già un ricavo, non crearne un altro
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
    codice,
    data,
    paziente_id,
    paziente_nome,
    servizio_nome,
    reparto,
    operatore_nome,
    importo,
    metodo,
    appuntamento_id,
    note
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
    'Auto da app#' || NEW.id::text
  );
  RETURN NEW;
END;
$function$;

-- ----- 2) fn_recall_auto -----------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_recall_auto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_attivo boolean;
  v_params jsonb;
  v_giorni int;
  v_operatore text;
BEGIN
  IF NEW.stato != 'Completato' THEN RETURN NEW; END IF;
  IF OLD.stato = 'Completato' THEN RETURN NEW; END IF;

  SELECT attivo, parametri INTO v_attivo, v_params
  FROM automazioni WHERE id = 'cb_recall_auto' LIMIT 1;
  IF v_attivo IS NOT TRUE THEN RETURN NEW; END IF;

  v_giorni := COALESCE((v_params->>'giorni_default')::int, 180);
  -- Fallback NULL (non più 'V. Crupi'): configurabile via automazioni.parametri.operatore_recall
  v_operatore := v_params->>'operatore_recall';

  IF EXISTS (
    SELECT 1 FROM task
    WHERE paziente_nome = NEW.paziente_nome
      AND tipo = 'Recall'
      AND stato != 'Completato'
      AND servizio_nome = NEW.servizio_nome
  ) THEN RETURN NEW; END IF;

  INSERT INTO task (
    codice,
    tipo,
    descrizione,
    priorita,
    stato,
    assegnato_a_nome,
    scadenza,
    paziente_nome,
    servizio_nome,
    note
  ) VALUES (
    'TSK-' || to_char(NOW(), 'YYMMDDHH24MISS'),
    'Recall',
    'Recall: ' || COALESCE(NEW.paziente_nome, '') || ' — ' || COALESCE(NEW.servizio_nome, ''),
    'Media',
    'Da fare',
    v_operatore,
    (NEW.data + (v_giorni || ' days')::interval)::date,
    COALESCE(NEW.paziente_nome, ''),
    COALESCE(NEW.servizio_nome, ''),
    'Auto da completamento'
  );
  RETURN NEW;
END;
$function$;

-- ----- 3) fn_parafarmacia_mirror ---------------------------------------
CREATE OR REPLACE FUNCTION public.fn_parafarmacia_mirror()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Entrata → ricavo (con IVA preservata)
  IF NEW.tipo = 'Entrata' THEN
    INSERT INTO ricavi (
      codice, data, servizio_nome, reparto, operatore_nome,
      importo, metodo, note, imponibile, aliquota_iva, iva
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
      NEW.iva
    );

  -- Uscita → costo (con IVA preservata)
  ELSIF NEW.tipo = 'Uscita' THEN
    INSERT INTO costi (
      codice, data, categoria, descrizione, importo, metodo, note, trigger_da,
      imponibile, aliquota_iva, iva
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
      NEW.iva
    );
  END IF;
  RETURN NEW;
END;
$function$;
