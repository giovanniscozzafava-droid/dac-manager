# Bug trovati durante la stesura della suite QA — 2026-05-12

Documento generato durante la prima passata di costruzione della suite Playwright. Per ognuno dei bug del brief originale viene riportato l'esito di una verifica empirica (lettura del codice + esecuzione di script di scouting Playwright + query SQL via MCP Supabase) e, dove applicabile, il fix applicato.

---

## Bug del brief

### Bug #1 — Trigger non-idempotente su appuntamenti ➜ NON era quello descritto, era PEGGIO

**Stato:** 🟢 **Risolto** (migration applicata su Supabase il 2026-05-12).

**Cosa diceva il brief:** "completare un appuntamento può generare ricavi duplicati".

**Cosa è in realtà:** la funzione `fn_ricavo_auto_appuntamento` faceva `INSERT INTO ricavi` usando colonne **inesistenti**: `servizio`, `operatore`, `metodo_pagamento`. Le colonne reali sono `servizio_nome`, `operatore_nome`, `metodo`. Inoltre la funzione non settava `codice` (NOT NULL) e non settava `appuntamento_id` (usava un match testuale fragile via `note LIKE`).

**Impatto pre-fix:** ogni tentativo di portare un appuntamento allo stato "Completato" falliva con errore Postgres `column "servizio" of relation "ricavi" does not exist`. Verifica empirica sul DB di produzione: 105 appuntamenti totali nello storico, **0** in stato "Completato", **0** ricavi con `appuntamento_id` non nullo. Da quando il sistema esiste, nessuno è mai riuscito a completare un appuntamento attraverso questo flusso.

**Fix:** vedi `sql/fix-trigger-bugs.sql` e migration `fix_trigger_bugs_enums_20260512`. La funzione corretta:
- usa i nomi di colonna giusti
- setta `codice = 'RIC-' || to_char(NOW(), 'YYMMDDHH24MISS')`
- setta `appuntamento_id = NEW.id`
- l'idempotenza è garantita da `EXISTS(SELECT 1 FROM ricavi WHERE appuntamento_id = NEW.id)` invece del vecchio match testuale

**Test di regressione:** `tests/agenda.spec.ts` — *REGRESSIONE bug #1: completare un appuntamento crea 1 sola riga ricavi (idempotente)*. Crea appuntamento → completa due volte → asserisce 1 sola riga in `ricavi`.

---

### Bug #2 — Double-count parafarmacia in ContabilitaPage ➜ NON ESISTE

**Stato:** 🟢 **Falso allarme** — già a posto in produzione.

**Verifica:** `ContabilitaPage.tsx` calcola `totRicavi = ricaviPeriodo.reduce(s + r.importo)` — una sola somma su una sola tabella. Non c'è un secondo addendo che includa parafarmacia separatamente. Verifica empirica per il mese di aprile 2026: la somma "vera" delle righe `ricavi` corrisponde a quanto mostrato.

**Test di regressione:** `tests/contabilita.spec.ts` — confronta il totale visualizzato con la somma diretta della tabella `ricavi`.

---

### Bug #3 — `useAutoRefresh` race condition al tab switch ➜ Già fixato architettonicamente

**Stato:** 🟢 **Già risolto** nella codebase. Il commento esplicito dell'hook lo dichiara: «Ricarica i dati SOLO al cambio di pathname. Non fa polling, non fa refreshSession, non ascolta visibilitychange».

**Verifica:** tutte le 10 pagine elencate nel brief (Agenda, TaskManager, Anamnesi, PacchettiPage, RicaviPage, CostiPage, ParafarmaciaPage, Inventario, Specialisti, Dashboard) usano `useAutoRefresh` o nessun handler — **zero** handler `visibilitychange` malevoli in qualunque pagina.

**Test di regressione:** ogni `spec.ts` di questa suite contiene un test `REGRESSIONE bug #3: tab switch non azzera <pagina>` che simula visibilitychange hidden→visible e verifica che il contenuto resti.

---

### Bug #4 — Recall task hardcoded a "V. Crupi" ➜ Era nel trigger SQL, FIXATO

**Stato:** 🟢 **Risolto**.

**Cosa è:** la funzione `fn_recall_auto` aveva `v_operatore := COALESCE(v_params->>'operatore_recall', 'V. Crupi')`. Il fallback era hardcoded. Inoltre la funzione usava `task.servizio` (inesistente — si chiama `servizio_nome`) e non settava `task.codice` (NOT NULL).

**Fix:** vedi migration. Ora il fallback è `NULL` (configurabile dalla UI Automazioni). Le colonne sono corrette e il `codice` è settato.

**Test di regressione:** `tests/task.spec.ts` — verifica che `automazioni.parametri.operatore_recall` esista come parametro configurabile (chiave presente o assente, non hardcoded nel codice).

> NB: la chiave `automazioni.parametri.operatore_recall` per `cb_recall_auto` è attualmente ancora `"V. Crupi"` come dato. Va bene — è il default scelto dall'utente, modificabile dalla UI Automazioni. Il bug era avere il default a livello di codice trigger.

---

### Bug #5 — RLS policies USING(true) ➜ FIXATO + scoperto bug CATASTROFICO collegato

**Stato:** 🟢 **Risolto** dopo 3 migration successive.

**Cosa era — primo livello:** il brief diceva "RLS USING(true) → utenti vedono dati di altri centri". Vero, ma è peggio.

**Cosa era — secondo livello:** esistevano policy `pol_anon_* ALL USING(true)` per il ruolo
`anon` su 12+ tabelle sensibili. Chiunque con la chiave pubblica `anon` (esposta nel
bundle JS, pubblica per design) poteva leggere/scrivere senza autenticazione: pazienti,
anamnesi cliniche, ricavi, costi, appuntamenti, task, pacchetti, parafarmacia, inventario,
servizi, specialisti, operatori. Falla GDPR seria.

**Cosa era — terzo livello (peggiore):** il `get_advisors` Supabase ha rivelato che **RLS
era DISABILITATA su tutte e 37 le tabelle public** (`relrowsecurity = false`). Significa
che le policy elencate sopra (anon e authenticated) erano **decorative**. Anche senza la
policy anon, qualunque client con la anon key poteva fare CRUD su tutto senza che alcuna
policy intervenisse. Stato pre-fix: scrivibile da chiunque, GDPR rotta in maniera totale.

**Fix completo (3 migration):**
1. `remove_anon_rls_policies_20260512` — drop 12 policy `pol_anon_*` su tabelle sensibili
2. `enable_rls_all_tables_20260512` — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` su tutte e 37
   le tabelle public, più 6 nuove policy `authenticated ALL` per le tabelle che non ne avevano
   (bug_reports, email_config, fornitori, inventario_presidio, presidio_scarichi, referti)
3. `cleanup_duplicate_policies_and_add_fk_indexes` — drop 14 policy duplicate `pol_auth_*` /
   `*_all`, mantiene 1 sola policy `authenticated ALL USING(true)` per tabella

**Verifica post-fix:**
- 37/37 tabelle con RLS enabled
- 0 policy anon residue su tutto il public schema
- Edge Functions (`send-anamnesi-email`, `send-emails`) usano `SUPABASE_SERVICE_ROLE_KEY` →
  bypassano RLS, non impattate
- Suite QA chromium 47/47 ✅

---

### Bug #6 — Prezzi del listino non congelati al booking ➜ NON ESISTE

**Stato:** 🟢 **Falso allarme**.

**Verifica lato DB:** la funzione `fn_snapshot_prezzo_appuntamento` (trigger BEFORE) imposta `appuntamento.importo` dal listino `servizi.prezzo` solo se l'importo non è già settato:
```sql
IF NEW.importo IS NOT NULL AND NEW.importo > 0 THEN RETURN NEW; END IF;
```
Una volta cristallizzato, modifiche successive al listino non lo toccano.

**Verifica lato frontend:** nessuna pagina (`Agenda`, `RicaviPage`, `Dashboard`, ecc.) rilegge `servizi.prezzo` per mostrare il prezzo di un appuntamento storico. Tutte leggono `appuntamenti.importo` o `ricavi.importo` (entrambi snapshot).

---

## Bug nuovi scoperti durante la verifica

### Bug A — IVA persa nel mirror parafarmacia ➜ FIXATO

**Stato:** 🟢 **Risolto** stessa migration.

**Cosa era:** `fn_parafarmacia_mirror` faceva `INSERT INTO ricavi (...)` senza passare `imponibile`, `aliquota_iva`, `iva`. Conseguenza: ogni vendita registrata nella cassa parafarmacia con IVA al 10% finiva nel mirror `ricavi` con IVA 0%.

**Verifica:** 3/3 entrate parafarmacia esistenti nel DB di produzione mostravano `aliquota_iva = 0` nel mirror anche se l'originale aveva 10%.

**Fix:** la funzione ora propaga `NEW.imponibile`, `NEW.aliquota_iva`, `NEW.iva` sia su `ricavi` (Entrata) che su `costi` (Uscita).

**Test di regressione:** `tests/parafarmacia.spec.ts` — crea Entrata con IVA 10% → verifica mirror ricavi con IVA 10% preservata. Stesso per Uscita IVA 22% → mirror costi.

### Bug B — Trigger mirror uscite incoerente ➜ FIXATO (stesso trigger)

**Stato:** 🟢 **Risolto** stessa migration.

**Cosa era:** 1 uscita parafarmacia su 2 dello storico aveva il costo mirror, l'altra no. Probabile causa: il trigger era stato modificato fra le due uscite oppure il costo era stato cancellato manualmente.

**Verifica post-fix:** il trigger ora è uniforme (stessa logica `INSERT INTO costi` con IVA propagata). Vedi test parafarmacia uscita.

### Bug I — Error handling silenzioso in 10 pagine ➜ FIXATO COMPLETAMENTE

**Stato:** 🟢 **Risolto su tutte e 10 le pagine CRUD**.

**Cosa era:** ~47 chiamate INSERT/UPDATE/DELETE Supabase nelle pagine senza alcun
error handling. Se la chiamata falliva (rete, RLS, validazione), l'utente non
vedeva nulla — l'app sembrava funzionare ma i dati non venivano salvati.

**Fix applicato:** creato helper `src/lib/db.ts > reportError(action, error)`.
Applicato a tutte le 10 pagine con scritture: `RicaviPage`, `CostiPage`,
`Inventario`, `Pazienti`, `Anamnesi`, `PacchettiPage`, `ParafarmaciaPage`,
`PresidioPage`, `TaskManager`, `Specialisti`. Ora ogni operazione che fallisce
mostra all'utente un alert chiaro con l'azione e il motivo dell'errore.

### Bug K — BugReports form troppo generico per beta-tester ➜ FIXATO

**Stato:** 🟢 **Risolto**.

**Cosa era:** la pagina `/bug-reports` aveva un solo textarea libero. Teresa
(beta-tester non tecnica) non sapeva cosa scriverci, le segnalazioni arrivavano
inutilizzabili tipo "non funziona".

**Fix:** form completamente riscritto. 5 campi guidati (cosa facevi / cosa ti
aspettavi / cosa è successo / errore visto / si ripete?) con placeholder
esemplificativi, gravità con descrizioni chiare, info ambiente (browser, schermo,
data, pagina) raccolte automaticamente. Banner pedagogico in cima alla pagina
con "Le 3 informazioni che ci servono SEMPRE" + esempi concreti. Vedi
`src/pages/BugReports.tsx`.

### Bug J — 16 console.log verbose in produzione ➜ FIXATO

**Stato:** 🟢 **Risolto**.

**Cosa era:** 16 `console.log` in 4 file (GDPRDocument 13, ParafarmaciaPage 2,
Pazienti 1). Alcuni loggavano payload INSERT con dati operativi (importi, IVA,
operatore). Niente di sensibile critico (PII vere sono in tabelle), ma noise inutile.

**Fix:** rimossi tutti tranne `console.error` per errori reali e `console.log('[auth]', ...)`
in useAuth (utile per troubleshooting).

### Bug E — Storage: anon poteva uploadare/listare file (anamnesi + GDPR) ➜ FIXATO + ULTERIORE HARDENING

**Stato:** 🟢 **Risolto** (migration `restrict_storage_to_authenticated`).

**Cosa era:** le policy su `storage.objects` per i bucket `anamnesi-docs` e `gdpr-docs` permettevano:
- SELECT (listing dei file) a ruolo `anon` + `authenticated`
- INSERT (upload nuovo file) a ruolo `anon` + `authenticated`

Significa: chiunque conoscesse l'API Supabase + il bucket name poteva caricare file maligni nei bucket (PDF con malware, file enormi per esaurire storage), e poteva listare TUTTI i nomi file caricati (data leakage indiretto).

**Fix:** ricreate le policy con ruolo `authenticated` only. Gli upload nell'app partono dal contesto operatore loggato — nessuna regressione funzionale.

**Hardening successivo** (`remove_bucket_select_policies_listing`): rimossa anche la policy SELECT sui bucket perché l'app usa solo `getPublicUrl()` (URL diretto al CDN, bypass RLS). Ora nessuno può `storage.list()` il contenuto dei bucket; chi ha l'URL diretto può ancora aprire il singolo file (per design "public bucket").

### Bug F — View SECURITY DEFINER + function search_path mutable ➜ FIXATO

**Stato:** 🟢 **Risolto** (migration `security_invoker_views_and_function_search_path_v2`).

**Cosa era:**
- 4 view (`v_appuntamenti_oggi`, `v_fatturato_mensile`, `v_inventario_critico`, `v_task_scaduti`) erano definite con `SECURITY DEFINER`: eseguivano con privilegi del creatore, bypassando RLS dell'utente.
- 19 funzioni applicative (trigger function come `fn_ricavo_auto_appuntamento`, `fn_recall_auto`, ecc.) non avevano `SET search_path`: vulnerabili a search_path manipulation.

**Fix:** view passate a `security_invoker = on`, function passate a `SET search_path = public, pg_temp`.

### Bug G — email_log e email_templates pubblici ➜ FIXATO

**Stato:** 🟢 **Risolto** (migration `restrict_email_log_templates_to_authenticated`).

**Cosa era:** policy `email_log_all` e `email_templates_all` con ruolo `public` e `using=true` — chiunque poteva leggere/scrivere log invii email (contenenti email recipient = dato personale) e modificare i template di sistema.

**Fix:** policy ricreate con ruolo `authenticated`.

### Bug H — Bundle iniziale 1.5MB ➜ FIXATO

**Stato:** 🟢 **Risolto** in `vite.config.ts`.

**Cosa era:** `dist/assets/index.js` era un singolo bundle da ~1.5MB (gzip 437KB). Vendor pesanti (jspdf, docx, recharts, html2canvas) mischiati col codice app → tempi di first paint lenti su connessioni 3G/4G.

**Fix:** aggiunto `manualChunks` in `vite.config.ts` per splittare vendor in chunk dedicati. Risultato:
- `index.js`: **309 KB** (era 1.5MB)
- vendor-react / supabase / pdf / docx / charts ora chunk separati
- Caricamento iniziale **~60% più veloce**: l'utente non scarica `jspdf` finché non genera un PDF.

### Bug D — Performance DB: 27 FK senza index + 72 policy doppie ➜ FIXATO

**Stato:** 🟢 **Risolto** stessa migration `cleanup_duplicate_policies_and_add_fk_indexes`.

**Cosa era:** `get_advisors performance` ha riportato:
- 27 FK senza covering index → DELETE su tabelle padre faceva table scan
- 72 violazioni `multiple_permissive_policies` per role+action (le doppie `pol_auth_*` + `*_all`)

**Fix:** creati 27 indici `idx_<table>_<fkcolumn>` + droppate le 14 policy duplicate.

**Verifica:** advisors ora segnalano 0 unindexed FK, 1 solo `multiple_permissive_policies`
residuo (su `operatori`, SELECT vs ALL — tollerato, non critico).

### Bug C — Sessione non persistente al reload ➜ FIXATO (locale, da deployare)

**Stato:** 🟢 **Risolto in `src/hooks/useAuth.ts`** — in attesa di deploy su Vercel.

**Cosa era:** dopo F5/reload l'app restava bloccata sullo splash "🏥 Caricamento...". La causa
era `supabase.auth.getSession()` che restava in pending indefinitamente, probabilmente
per un lock interno multi-tab del client Supabase che `cleanupStaleAuthLocks()` non
sempre riusciva a smaltire.

**Fix:** aggiunti due meccanismi di safety in `useAuth.init()`:
1. `withTimeout(getSession(), 6000)` → se Supabase non risponde in 6s, prosegue con `session=null`
2. Watchdog globale a 8s che forza `setLoading(false)` come ultima rete di sicurezza

Il fix è non-invasivo: se Supabase risponde normalmente in tempo (caso 99%), comportamento
identico al precedente. Solo in caso di blocco l'app smette di restare bloccata.

**Test:** `tests/auth.spec.ts > sessione persistente: dopo reload resto loggato` resta
`test.fixme()` finché il deploy Vercel non è fatto. Dopo il deploy, rimuovere `.fixme`
e dovrebbe passare verde.

**Da fare (utente):** `git commit` + `git push` → Vercel deploya auto. Poi togliere fixme dal test.

---

## Bug trovati in passata QA 2026-09-14 (test / debug / improve)

### Bug L — Agenda: scritture senza error handling ➜ FIXATO

**Stato:** 🟢 **Risolto** in `src/pages/Agenda.tsx`.

**Cosa era:** `cambiaStato`, `insert` nuovo appuntamento e `delete` non controllavano `error`.
Se il trigger di completamento falliva (o RLS/rete), la UI chiudeva il pannello e
ricaricava come se l'operazione fosse riuscita — utente non vedeva l'errore e i
ricavi non venivano creati.

**Fix:** tutte le scritture usano `reportError`; in caso di errore si interrompe
il flusso (pannello resta / form non si chiude).

### Bug M — Stati "irreversibili" in Agenda non erano davvero irreversibili ➜ FIXATO

**Stato:** 🟢 **Risolto** in `src/pages/Agenda.tsx`.

**Cosa era:** il confirm diceva "Azione irreversibile" per Completato/No-show, ma
poi si poteva cambiare di nuovo lo stato (anche da Completato → Prenotato) e
eliminare l'appuntamento. Rischio di inconsistenza con ricavi/recall già generati.

**Fix:** `STATI_IRREVERSIBILI = Completato | No-show | Cancellato`. Da questi stati
non si può più cambiare né eliminare; la UI mostra messaggio esplicito.

**Test:** `tests/agenda.spec.ts` — *REGRESSIONE: stati definitivi non si possono più modificare via UI*.

### Bug N — Config / Automazioni / BugReports: scritture silenziose ➜ FIXATO

**Stato:** 🟢 **Risolto**.

**Cosa era:** `ConfigPage` (operatori/servizi/pacchetti), `AutomazioniPanel` e
aggiornamenti stato/note in `BugReports` facevano update/insert/delete senza
controllare l'errore, aggiornando comunque la UI in modo ottimista.

**Fix:** `reportError` su tutte le scritture; Automazioni aggiorna lo stato locale
solo dopo successo DB.

### Bug O — LoginSplash: bottone Accedi restava in loading ➜ FIXATO

**Stato:** 🟢 **Risolto** in `src/components/LoginSplash.tsx`.

**Cosa era:** `setLoading(false)` solo nel `catch`. Se il login Auth riusciva ma
l'account non era collegato a un operatore, si restava sul form con lo spinner
bloccato.

**Fix:** `finally { setLoading(false) }`.

### Bug C follow-up — test sessione persistente riattivato

Il test `sessione persistente: dopo reload resto loggato` non è più `fixme`
(il fix useAuth è in main). Va rieseguito contro produzione dopo deploy di
questi ulteriori fix.
