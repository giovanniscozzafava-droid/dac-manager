# MIGRATION — Piano per fasi (senza big-bang)

Obiettivo: arrivare alle API esterne **senza spegnere** l’operatività quotidiana di Palazzo della Salute.

## Fase 0 — Fondamenta (questa PR / scaffold)

- [x] Documentazione AS-IS / TARGET / INTEGRATIONS  
- [x] Tipi dominio + port TypeScript  
- [x] SQL `integration_connections`, `integration_external_ids`, `integration_outbox`, `integration_inbox`  
- [ ] Aggiungere a `ricavi`/`costi` (o nuova `billable_events`) colonne `source_system`, `source_external_id`, `invoice_status`  
- [ ] Config UI “Integrazioni” (solo stato connessione, no secret in chiaro)

**Criterio di uscita:** schema deployato; nessun comportamento utente cambiato.

## Fase 1 — MPI + mapping ID

1. Trattare `pazienti` come anagrafica canonica.  
2. Alla create/update paziente → outbox `PatientUpserted`.  
3. Adapter stub (log-only) poi vendor reali.  
4. Tabella mapping popolata per lab/clinica/FiC.

**Criterio:** stesso CF non crea doppioni negli esterni in test.

## Fase 2 — Fatturazione (FiC) su eventi esistenti

1. Introdurre `billable_events` (migrazione da `ricavi` con `source`).  
2. UI Contabilità: “Da fatturare” / “Fatturati”.  
3. Adapter FiC: `ensureClient` + `createInvoice` da selezione eventi.  
4. I trigger agenda/parafarmacia scrivono anche outbox (oltre al ledger).

**Criterio:** una prestazione completata può diventare fattura FiC senza doppio inserimento manuale.

## Fase 3 — Parafarmacia esterna

1. Spegnere la cassa DAC come SoT in un punto vendita pilota.  
2. Import notturno/webhook `SaleRecorded`.  
3. Disabilitare `fn_parafarmacia_mirror` quando `source_system=pharmacy_ext`.  
4. Magazzino DAC → read-only o nascosto.

**Criterio:** saldo giornaliero DAC = report gestionale parafarmacia (± tolleranza riconciliata).

## Fase 4 — Laboratorio (LIS)

1. Catalogo esami: mapping `servizi` reparto Laboratorio ↔ codici LIS.  
2. Da appuntamento lab confermato → `createOrder`.  
3. Webhook `ReportReady` → link in paziente / anamnesi.  
4. Inventario reagenti: piano di dismissione SoT DAC.

**Criterio:** ordine lab tracciato end-to-end senza digitare due volte il paziente.

## Fase 5 — Cliniche

1. Decidere SoT agenda.  
2. Sync appuntamenti + ricezione `VisitCompleted`.  
3. Anamnesi: push link documento, non duplicare cartella.

## Fase 6 — Hardening

- Dead letter queue, alert, runbook  
- Idempotenza e replay  
- Report hub solo su eventi riconciliati  
- Chiudere write dirette UI verso tabelle “owned” dall’esterno  

## Governance

Ogni nuovo software vendor richiede:

1. Scheda adapter (auth, rate limit, sandbox)  
2. Matrice eventi in/out  
3. Test di idempotenza  
4. Owner operativo (chi rilancia outbox failed)

## Non fare

- Big-bang “spegni DAC cassa + accendi gestionale” senza periodo parallelo.  
- Fatturare da trigger sincronizzati alla UI.  
- Mettere API keys nel bundle Vite.
