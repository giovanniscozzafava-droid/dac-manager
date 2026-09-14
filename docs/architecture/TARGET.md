# TARGET — Architettura a contesti + hub DAC

## Visione

DAC Manager non sostituisce LIS, gestionale clinica, gestionale parafarmacia o Fatture in Cloud.  
Diventa:

1. **Master Patient Index (MPI)** operativo del centro  
2. **Agenda / front-office** unificata (o sync con clinica se la clinica è SoT agenda)  
3. **Orchestratore eventi** (esame richiesto, prestazione erogata, vendita, da fatturare)  
4. **Cruscotto e report** cross-sistema (dopo riconciliazione)  
5. **Documentazione** (anamnesi, GDPR) e task/recall

## Contesti delimitati (bounded contexts)

```
┌─ IDENTITY ────────────┐  ┌─ MPI / PAZIENTE ──────┐  ┌─ AGENDA & FRONT ─────┐
│ operatori, ruoli,     │  │ anagrafica canonica,  │  │ slot, stati, no-show │
│ auth Supabase         │  │ CF, consenso GDPR     │  │ collegamento servizio│
└───────────────────────┘  └──────────┬────────────┘  └──────────┬───────────┘
                                      │                          │
         ┌────────────────────────────┼──────────────────────────┼──────────┐
         ▼                            ▼                          ▼          ▼
┌─ LAB (esterno) ─┐  ┌─ CLINICA (est) ─┐  ┌─ PARAFARMACIA ─┐  ┌─ FATTURAZIONE ─┐
│ accettazione    │  │ cartella,       │  │ stock, cassa,  │  │ clienti fiscali│
│ esami, referti  │  │ visite, agenda  │  │ listini        │  │ fatture SDI    │
│ reagenti LIS    │  │ specialistica   │  │ (gestionale)   │  │ (FiC / altro)  │
└────────┬────────┘  └────────┬────────┘  └───────┬────────┘  └───────┬────────┘
         │                    │                   │                   │
         └────────────────────┴─────────┬─────────┴───────────────────┘
                                        ▼
                              ┌─ BILLABLE LEDGER ─┐
                              │ eventi economici   │
                              │ (non = fattura)    │
                              │ source + ext_ref   │
                              └─────────┬──────────┘
                                        ▼
                              ┌─ REPORTING HUB ───┐
                              │ Contabilità ops,   │
                              │ export admin, KPI  │
                              └────────────────────┘
```

## Source of Truth (decisione obbligatoria)

| Dominio | Source of Truth | Ruolo DAC |
|---|---|---|
| Anagrafica paziente (MPI) | **DAC** (canonica) | Push/upsert verso esterni; pull conflitti con regole |
| Consensi GDPR / anamnesi | **DAC** | Resta locale + storage |
| Esami di laboratorio | **LIS** | DAC crea *ordine* / riceve *referto ready* |
| Stock reagenti lab | **LIS** (o ERP lab) | DAC smette di essere SoT; eventuale mirror read-only |
| Agenda ambulatoriale | **DAC** *oppure* software cliniche (scegliere 1) | Sync bidirezionale se split |
| Cartella clinica specialistica | **Software cliniche** | DAC tiene link + anamnesi infermieristica |
| Magazzino / cassa parafarmacia | **Gestionale parafarmacia** | DAC riceve vendite come eventi; UI cassa diventa opzionale/bridge |
| Fatture / NC / SDI | **Fatture in Cloud** (o equivalente) | DAC invia *documento da emettere*; tiene `external_id` |
| Ledger operativo (KPI) | **DAC** (proiezione) | Materializza da eventi, non da insert sparsi |
| Listino servizi centro | **DAC** (catalogo hub) | Mappa codici verso listini esterni |

> Regola: **una sola SoT per dominio**. Se due sistemi scrivono la stessa entità, serve un owner e un flusso di sync esplicito.

## Modello interno: da “tabelle piatte” a “eventi + proiezioni”

### Oggi
`INSERT ricavi` da UI / trigger / mirror — senza `source`, senza `external_id`.

### Domani
1. Accade un **fatto di business** (prestazione completata, vendita, esame refertato).  
2. Si scrive un **domain event** (tabella outbox).  
3. I consumer aggiornano:
   - ledger operativo (`billable_events` / `ricavi` arricchiti)
   - adapter fatturazione
   - adapter lab / clinica / parafarmacia (se outbound)

### Campi minimi su ogni movimento economico

```
id, occurred_at, patient_id, amount_gross, vat_rate, vat_amount, net_amount,
source_system, source_event_type, source_external_id, channel (lab|clinic|pharmacy|manual),
invoice_status (none|pending|sent|invoiced|error), invoice_external_id
```

Le tabelle `ricavi`/`costi` esistenti diventano **proiezioni** (o vengono migrate aggiungendo queste colonne).

## Strati software

| Layer | Dove | Responsabilità |
|---|---|---|
| UI | `src/pages` (evoluta) | Comandi utente, niente sync grezzo |
| Application / use-cases | futuro `src/application` | “completaAppuntamento”, “richiediFattura” |
| Domain | `src/domain` | Tipi, ID, invarianti |
| Ports | `src/integrations/ports` | Interfacce Lab/Clinic/Pharmacy/Invoicing |
| Adapters | Edge Functions + `adapters/*` | HTTP OAuth, mapping payload vendor |
| Persistence | Supabase | MPI, outbox, mapping ID, proiezioni |
| Workers | Edge cron / queue | Drain outbox, retry, dead-letter |

## Anti-corruption layer

Ogni vendor (LIS X, gestionale Y, FiC) ha un adapter che:

- traduce **eventi DAC → API vendor**
- traduce **webhook/API vendor → eventi DAC**
- mantiene `integration_external_ids (system, entity_type, local_id, external_id)`

Nessuna pagina React deve conoscere URL o schema di Fatture in Cloud.

## Cosa smette di fare DAC (gradualmente)

| Funzione attuale | Destino |
|---|---|
| Cassa parafarmacia come SoT vendite | Bridge → poi sola lettura eventi |
| Inventario lab come SoT reagenti | Mirror o deprecato a favore LIS |
| `ricavi` = “fatturato” | Ledger ops + fatture su FiC |
| Registro specialisti “fatturato_lordo” manuale | Eventi da clinica + regole % |

## Cosa DAC continua a fare meglio degli altri

- Unico punto di accettazione paziente / CF / privacy  
- Vista giornaliera multi-reparto (lab + estetica + specialisti + parafarmacia)  
- Anamnesi + invio documenti  
- Task/recall cross-reparto  
- Report direzionale dopo riconciliazione  
- Orchestrazione “da fatturare oggi”
