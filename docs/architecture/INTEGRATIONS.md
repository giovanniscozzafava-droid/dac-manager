# INTEGRATIONS — Contratti verso i 4 sistemi

I vendor concreti (quale LIS, quale gestionale clinica/parafarmacia) vanno scelti a parte.  
Qui restano i **port** stabili: se cambia il software, si riscrive solo l’adapter.

## Pattern comuni

1. **Outbound:** use-case DAC → insert `integration_outbox` → worker chiama adapter → marca `sent` / `failed`.  
2. **Inbound:** webhook Edge Function → verifica firma → idempotency key → domain event → proiezioni.  
3. **Mapping ID:** sempre via `integration_external_ids`.  
4. **Idempotenza:** `(system, idempotency_key)` unique su outbox e inbox.

---

## 1. Laboratorio analisi (`LabSystemPort`)

### Responsabilità esterne
Accettazione campioni, catalogo esami, stati lavorazione, referti, (opz.) stock reagenti.

### Comandi DAC → Lab
| Comando | Quando | Payload minimo |
|---|---|---|
| `upsertPatient` | nuovo/aggiornato MPI | CF, nome, cognome, sesso, data nascita, contatti |
| `createOrder` | accettazione / appuntamento lab confermato | patient_ext_id, exam_codes[], priority, requesting_doctor?, appointment_ref |
| `cancelOrder` | no-show / cancellazione | order_ext_id, reason |

### Eventi Lab → DAC
| Evento | Effetto in DAC |
|---|---|
| `OrderAccepted` | aggiorna stato prestazione hub |
| `OrderCompleted` / `ReportReady` | link referto, eventuale `BillableEvent` se non già creato |
| `OrderRejected` | alert operatore |

### Non fare
- Non duplicare il motore referti in DAC.  
- Non usare `inventario` DAC come SoT reagenti una volta attivo il LIS.

---

## 2. Cliniche / ambulatori (`ClinicSystemPort`)

### Responsabilità esterne
Cartella clinica, diagnosi, terapie, (opz.) agenda specialistica.

### Comandi DAC → Clinica
| Comando | Quando |
|---|---|
| `upsertPatient` | sync MPI |
| `pushAnamnesiSummary` | dopo anamnesi (link doc, non PHI ridondante se già in PDF/DOCX) |
| `syncAppointment` | se DAC è SoT agenda |

### Eventi Clinica → DAC
| Evento | Effetto |
|---|---|
| `VisitCompleted` | chiude ciclo, `BillableEvent` visita |
| `AppointmentChanged` | se clinica è SoT agenda |
| `ClinicalNoteAvailable` | link in timeline paziente |

### Decisione aperta
**Chi possiede l’agenda specialistica?**  
Raccomandazione iniziale: **DAC SoT agenda front-office**; clinica SoT cartella. Sync one-way appuntamenti DAC→clinica finché non serve bi-direzionale.

---

## 3. Parafarmacia (`PharmacySystemPort`)

### Responsabilità esterne
Anagrafica prodotti, giacenze, listini, vendite POS, resi.

### Direzione consigliata
1. **Fase A:** gestionale parafarmacia SoT; DAC importa vendite giornaliere (`SaleRecorded`) nel ledger.  
2. **Fase B:** UI cassa DAC diventa opzionale (solo se POS non coperto).  
3. Deprecare `fn_parafarmacia_mirror` quando le vendite arrivano già come eventi con IVA.

### Eventi Pharmacy → DAC
| Evento | Effetto |
|---|---|
| `SaleRecorded` | `BillableEvent` channel=pharmacy (Entrata) |
| `PurchaseRecorded` / `StockAdjustment` | costo / alert (opz.) |
| `SaleVoided` | storno ledger + blocca fattura se non emessa |

### Comandi DAC → Pharmacy (opzionali)
`upsertPatient` (fidelity), `reserveProduct` (raro).

---

## 4. Fatturazione — Fatture in Cloud (`InvoicingPort`)

Riferimento API: `https://api-v2.fattureincloud.it`, OAuth2, scope tipici  
`entity.clients:a`, `issued_documents.invoices:a`, `issued_documents.credit_notes:a`.

### Modello mentale
DAC non “scrive ricavi fiscali”. DAC accumula **billable events** e, su comando (manuale o policy), crea:

- Client FiC (mappato da paziente/azienda)  
- Issued document (fattura / ricevuta / NC)

### Comandi
| Comando | Note |
|---|---|
| `ensureClient` | match su CF/P.IVA; salva `external_id` |
| `createInvoice` | da 1..N billable events; `items_list` con IVA |
| `createCreditNote` | storno |
| `getDocumentStatus` | polling/webhook se disponibile |

### Stati su billable event
`none → pending → sent → invoiced` oppure `error` (retry outbox).

### Mapping IVA
Usare aliquote già presenti in DAC (0/4/10/22). L’adapter traduce nel formato FiC (`vat` / nature se esente).

### Cosa non fare
- Non emettere fattura dal trigger SQL in sincrono con la UI.  
- Non usare la sola tabella `ricavi` come coda fatture senza `invoice_status`.

---

## Eventi di dominio canonici (DAC)

Definiti in `src/integrations/events/types.ts`:

- `PatientUpserted`
- `AppointmentScheduled` / `AppointmentCompleted` / `AppointmentNoShow` / `AppointmentCancelled`
- `LabOrderRequested` / `LabReportReady`
- `ClinicVisitCompleted`
- `PharmacySaleRecorded` / `PharmacySaleVoided`
- `BillableEventCreated`
- `InvoiceRequested` / `InvoiceIssued` / `InvoiceFailed`
- `AnamnesiSubmitted`

Ogni evento ha: `id`, `occurred_at`, `aggregate_type`, `aggregate_id`, `payload`, `correlation_id`.

---

## Sicurezza

- Credenziali vendor solo in secrets Edge (mai `VITE_*`).  
- Webhook con HMAC / OAuth.  
- Minimo privilege per scope FiC.  
- Log `integration_http_log` senza PHI non necessari (mascherare CF dove possibile).  
- RLS: service role solo nelle Edge; UI resta `authenticated`.
