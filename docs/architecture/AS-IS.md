# AS-IS — Stato attuale DAC Manager

## Forma del sistema

- **Frontend:** React 18 + Vite + React Router (`src/pages/*`)
- **Backend de facto:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Pattern:** ogni pagina chiama `supabase.from(...).insert/update/delete` direttamente
- **Side-effect:** trigger PL/pgSQL (`sql/fix-trigger-bugs.sql`) + tabella `automazioni`

Non esiste oggi un layer di dominio, né porte verso sistemi esterni (salvo Brevo email).

## Moduli funzionali ↔ pagine ↔ tabelle

| Contesto operativo | UI | Tabelle principali | Write path |
|---|---|---|---|
| Auth / operatori | `LoginSplash`, `useAuth` | `operatori` | login + CRUD Config |
| Agenda | `Agenda.tsx` | `appuntamenti`, `servizi` | insert/update stato/delete |
| Anagrafica | `Pazienti.tsx` | `pazienti`, `codici_catastali` | CRUD + GDPR |
| Clinica docs | `Anamnesi.tsx` | `anamnesi`, Storage | insert + email Edge |
| Specialisti | `Specialisti.tsx` | `specialisti`, `disponibilita_*`, `registro_*` | CRUD |
| Pacchetti | `PacchettiPage.tsx` | `pacchetti`, `pacchetti_predefiniti` | sedute + CRUD |
| Lab magazzino | `Inventario.tsx` | `inventario`, `fornitori` | CRUD stock |
| Presidio | `PresidioPage.tsx` | `inventario_presidio`, `presidio_scarichi`, `costi` | scarico → costo |
| Parafarmacia | `ParafarmaciaPage.tsx` | `parafarmacia_cassa`, `inventario_parafarmacia` | cassa + magazzino |
| Ricavi / Costi | `RicaviPage`, `CostiPage` | `ricavi`, `costi` | CRUD manuale |
| Report | `ContabilitaPage` + `lib/reports.ts` | lettura `ricavi`/`costi` | export CSV/PDF |
| Task / CRM light | `TaskManager` | `task` | CRUD + recall trigger |
| Config | `ConfigPage`, `AutomazioniPanel` | `servizi`, `automazioni`, `email_config` | CRUD |
| Ops | `BugReports`, `Dashboard` | `bug_reports` + aggregati | — |

## Flussi side-effect già presenti (critici per integrazioni)

1. **Appuntamento → Completato**  
   Trigger `fn_ricavo_auto_appuntamento` → INSERT `ricavi` (idempotente su `appuntamento_id`).  
   Trigger `fn_recall_auto` → INSERT `task` Recall.

2. **Cassa parafarmacia → mirror contabile**  
   Trigger `fn_parafarmacia_mirror` → INSERT `ricavi` (Entrata) o `costi` (Uscita) con IVA.

3. **Scarico Presidio**  
   UI sequenziale: aggiorna stock → log scarico → INSERT `costi` (ora con codice + lock).

4. **Email**  
   Edge `send-emails` / `send-anamnesi-email` → Brevo (unico adapter esterno reale).

## Problemi strutturali (perché non basta “attaccare le API”)

### 1. Source of truth ambigua
- **Paziente** vive solo in DAC, ma lab/clinica/parafarmacia/fatturazione avranno ciascuno la propria anagrafica.
- **Vendita parafarmacia** è in DAC (`parafarmacia_cassa`) *e* verrà nel gestionale parafarmacia.
- **Ricavo** nasce da agenda *e* da cassa *e* da insert manuale: tre origini nella stessa tabella piatta.

### 2. Contabilità operativa ≠ fatturazione fiscale
`ricavi` non è una fattura: manca cliente fiscale, numero documento, stato SDI, collegamento FiC.  
Esportare CSV non sostituisce l’emissione fattura.

### 3. Laboratorio “Inventario” ≠ LIS
`inventario` gestisce reagenti/scorte, non accettazione esami, barcode, referti, connessione analizzatori. Un software lab reale è un **LIS**: DAC non deve fingere di esserlo.

### 4. Accoppiamento UI–DB
Logica di business nelle pagine React + trigger SQL. Non c’è un posto unico dove dire “quando completo un esame lab, cosa succede a fatturazione?”.

### 5. Identità deboli
Molti join sono per `paziente_nome` / `operatore_nome` (testo), non solo UUID. Fragili per sync esterni.

### 6. Report e automazioni sopra dati misti
`ContabilitaPage` somma tutto ciò che è in `ricavi`/`costi` senza distinguere origine (`agenda` | `parafarmacia` | `manuale` | `futuro_lab`). Con integrazioni, senza `source`/`external_ref` i KPI diventano inutilizzabili.

## Inventario tabelle (dal codice)

`operatori`, `pazienti`, `appuntamenti`, `servizi`, `anamnesi`, `specialisti`, `disponibilita_specialisti`, `registro_specialisti`, `pacchetti`, `pacchetti_predefiniti`, `inventario`, `inventario_presidio`, `presidio_scarichi`, `inventario_parafarmacia`, `parafarmacia_cassa`, `fornitori`, `ricavi`, `costi`, `task`, `automazioni`, `configurazione`, `email_config`, `email_templates`, `email_log`, `bug_reports`, `codici_catastali`, `referti` (citata in migrazioni storiche).

## Rischi se si integra senza riprogettare

1. Doppio scontrino parafarmacia (DAC + gestionale) → ricavi gonfiati.  
2. Fattura FiC + riga già in `ricavi` senza link → double count in amministrazione.  
3. Paziente creato 4 volte (DAC, lab, clinica, FiC) con CF discordanti.  
4. Completamento appuntamento crea ricavo locale *e* ordine lab *e* bozza fattura senza orchestrazione.  
5. Stock reagenti in DAC vs stock LIS divergenti.  
6. Trigger SQL che non sanno dell’outbox → eventi persi verso l’esterno.  
7. Delete cassa che lascia mirror (già noto) → peggiora con sync.  
8. RLS “authenticated ALL” insufficiente quando arrivano service account multi-tenant.  
9. Export report su dati non riconciliati → decisioni sbagliate in direzione.  
10. Vendor lock su un solo software lab senza anti-corruption layer.
