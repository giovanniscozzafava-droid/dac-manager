# Suite QA — DAC Manager

Suite di test end-to-end basata su Playwright. Copre auth, navigazione, CRUD via API + UI, regressioni dei bug noti.

## Quick start

```bash
# 1. installare dipendenze (una sola volta)
npm install
npx playwright install

# 2. modalità "uso quotidiano" — un solo browser, veloce (~2 min)
npx playwright test --project=chromium

# 3. modalità "full cross-browser" — 3 browser, sequenziale per evitare rate-limit Supabase (~7 min)
npx playwright test --workers=1

# 4. un singolo file
npx playwright test tests/agenda.spec.ts --project=chromium

# 5. solo i test che matchano un pattern
npx playwright test -g "REGRESSIONE bug #1" --project=chromium

# 6. modalità interattiva con UI di Playwright
npx playwright test --ui

# 7. report HTML dell'ultima esecuzione
npx playwright show-report
```

### Perché `--workers=1` per cross-browser?

Ogni test fa login via UI all'app (la fixture `authedPage`). Supabase ha un rate-limit
sulle auth requests (~10 al minuto per IP). Con 2 worker paralleli su 3 browser sono
~6 login concorrenti per test e si supera il limit, generando flake. Con `--workers=1`
i test sono sequenziali → max 1 login per volta → niente flake.

In CI di solito si lancia un solo browser alla volta (matrix strategy), quindi non
è un problema.

## Cosa c'è nella suite

| File | Cosa testa |
|---|---|
| `auth.spec.ts` | login OK, login KO, logout, sessione persistente (1 fixme — bug C in BUGS_FOUND.md), reset password (fixme) |
| `dashboard.spec.ts` | KPI Appuntamenti Oggi + Fatturato Mese, formato €, regressione bug #3 |
| `agenda.spec.ts` | header, appuntamento via API persistito, **REGRESSIONE bug #1** (completamento crea 1 ricavo idempotente), regressione bug #3 |
| `pazienti.spec.ts` | header, paziente via API trovato nella ricerca, filtro inesistente, regressione bug #3 |
| `task.spec.ts` | header, task creato via API in lista, **REGRESSIONE bug #4** (operatore_recall configurabile, niente V. Crupi hardcoded), regressione bug #3 |
| `anamnesi.spec.ts` | header, apri form Nuova Anamnesi, filtro ricerca, regressione bug #3 (+2 fixme PDF/email) |
| `pacchetti.spec.ts` | header, pacchetto via API persistito (round-trip), regressione bug #3 |
| `inventario.spec.ts` | header, prodotto via API trovato nella ricerca, regressione bug #3 |
| `presidio.spec.ts` | header, form con campi IVA scorporata, regressione bug #3 |
| `parafarmacia.spec.ts` | header, **REGRESSIONE bug A** (Entrata + Uscita → mirror con IVA preservata), regressione bug #3 |
| `ricavi.spec.ts` | header, ricavo via API trovato nella ricerca, regressione bug #3 |
| `costi.spec.ts` | header, costo via API trovato nella ricerca, regressione bug #3 |
| `contabilita.spec.ts` | header + tab, **REGRESSIONE bug #2** (totale = somma diretta di `ricavi`), regressione bug #3 |
| `specialisti.spec.ts` | header, regressione bug #3 |
| `responsive.spec.ts` | sidebar desktop visibile, drawer mobile chiuso di default + apertura via hamburger, drawer si chiude dopo navigazione |

Tutto quello che vedi marcato `REGRESSIONE bug #X` deriva direttamente dal brief originale o dai bug nuovi scoperti durante la verifica — vedi `tests/BUGS_FOUND.md`.

## Architettura

### Configurazione

`playwright.config.ts`:
- `testIgnore: ['**/_scouts/**', '**/auth.setup.ts']` — gli scout sono debug, fuori dalla suite ufficiale
- 3 progetti: `chromium`, `firefox`, `Mobile Chrome` (Pixel 5)
- baseURL = `https://dac-manager.vercel.app` (produzione)

### Login

Ogni test che ha bisogno di essere loggato usa la fixture `authedPage`:

```ts
import { test, expect } from './helpers/fixtures';

test('mio test', async ({ authedPage: page }) => {
  // page è già loggata
});
```

Il login avviene via UI (form email/password) usando le credenziali in `.env`:
```
DAC_TEST_EMAIL=...
DAC_TEST_PASSWORD=...
```

Per i test che testano il login stesso (`auth.spec.ts`), si usa `test` da `@playwright/test` direttamente e si chiama `loginViaUI(page)` manualmente.

### Dati di test e cleanup

Tutti i dati creati durante un test sono prefissati con `__TEST_<MODULO>_<timestamp>_<random>` (helper `makeTestTag` in `helpers/supabase.ts`). Il cleanup avviene in `afterEach` di ogni spec, cancellando per ID raccolti durante il test (più affidabile) o tramite `cleanupByTag()` come fallback.

In caso di crash dei test, i record `__TEST_*` rimasti si possono pulire massivamente con:
```ts
import { getAuthedSupabase, cleanupAllTestPrefix } from './tests/helpers/supabase';
const sb = await getAuthedSupabase();
await cleanupAllTestPrefix(sb);
```

### Helpers

- `helpers/fixtures.ts` — fixture `authedPage`
- `helpers/auth.ts` — `loginViaUI()`, `navigateViaSidebar()`, `simulateTabSwitch()`
- `helpers/supabase.ts` — `getAuthedSupabase()`, `makeTestTag()`, `cleanupByTag()`, `cleanupAllTestPrefix()`
- `auth.setup.ts` — esiste come baseline (storage state) ma non è usato dalla configurazione attuale (decisione: login per test = più affidabile dello storageState con Supabase)

### Scout

`tests/_scouts/*.spec.ts` — script Playwright esplorativi usati durante la prima sessione per diagnosticare i bug. Lasciati come riferimento storico. **Esclusi dalla suite ufficiale** via `testIgnore`. Per rilanciarli serve modificare temporaneamente la config.

## Come aggiungere un nuovo spec

1. Crea `tests/<modulo>.spec.ts`
2. Importa la fixture:
   ```ts
   import { test, expect } from './helpers/fixtures';
   import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
   import { getAuthedSupabase, makeTestTag, cleanupByTag } from './helpers/supabase';
   import type { SupabaseClient } from '@supabase/supabase-js';
   ```
3. Apri con `let sb: SupabaseClient; test.beforeAll(async () => { sb = await getAuthedSupabase(); });` se ti serve scrivere/leggere via API
4. Per ogni test che crea dati: usa `makeTestTag('<MODULO>')`, salva l'ID per cleanup in `afterEach`
5. Asserzioni concrete: stato in tabella, presenza di un testo univoco, conteggio righe — **non solo "la pagina si carica"**
6. Se trovi un bug:
   - Marca il test con `test.fixme()` + commento `// FIXME BUG: <descrizione>`
   - Aggiungi una riga nuova in `tests/BUGS_FOUND.md` con dettagli e riproduzione

## Interpretare i report

### CLI
```bash
npx playwright test --reporter=line
```
Output rapido: ogni riga è un test. Verde = ok. Rosso = fail.

### HTML
```bash
npx playwright show-report
```
Apre il browser sul report dell'ultima esecuzione. Per ogni test fallito vedi:
- Lo screenshot del momento del fail
- Il video (se attivato)
- La trace step-by-step
- Il DOM snapshot

### test.fixme
I test marcati `test.fixme()` appaiono come **skipped (expected fail)** nel report. Sono test che descrivono un comportamento che oggi non funziona e che vogliamo riattivare appena il bug viene fixato. Non rompono la build.

## Vincoli e scelte

- **Non modificare `src/`**. La suite tocca solo `tests/`, `playwright.config.ts`, `package.json` (devDeps), `.gitignore`.
- **Niente credenziali hardcoded**. Tutto da `process.env` (Supabase anon key è pubblica per design e già hardcoded in `src/lib/supabase.ts`).
- **Cleanup obbligatorio** per qualunque test che scrive sul DB di produzione (al momento non c'è staging).
- **Selettori semantici prima** (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`). Mai selettori CSS o XPath fragili.

## Roadmap

Cose lasciate fuori da questa prima passata:

- Bug C (sessione non persistente al reload) — segnalato in BUGS_FOUND.md
- Bug #5 RLS multi-tenant — richiede secondo utente di test
- Anamnesi PDF e invio email — richiedono mock SMTP o inbox API
- Test di carico / regressione visiva
- CI: aggiungere `.github/workflows/playwright.yml` quando si vuole runnare su push/PR
