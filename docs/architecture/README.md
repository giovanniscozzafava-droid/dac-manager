# DAC Manager — Architettura integrazioni

**Palazzo della Salute / LABORATORI DAC S.R.L.**  
Documento di riprogettazione (2026-09). Branch: `cursor/architettura-integrazioni-7800`.

## Perché ripensare tutto

Oggi DAC Manager è un **monolite UI → Supabase**: ogni pagina scrive tabelle, i trigger SQL fanno side-effect (ricavo da appuntamento, mirror cassa parafarmacia). Funziona come gestionale “tutto-in-uno”, ma **non è pronto** a connettersi in modo stabile a:

| Sistema esterno | Ruolo atteso |
|---|---|
| Software **laboratorio analisi** | Esami, accettazione, referti, reagenti |
| Software **cliniche / ambulatori** | Agenda clinica, cartelle, specialisti |
| **Gestionale parafarmacia** | Magazzino, cassa, listini, scontrini |
| Software **fatturazione** (es. Fatture in Cloud) | Fatture, note credito, anagrafica clienti fiscali |

Senza confini chiari si rischia: doppi pazienti, doppie vendite, IVA incoerente, fatture duplicate, stock divergenti.

## Documenti

| File | Contenuto |
|---|---|
| [AS-IS.md](./AS-IS.md) | Mappa attuale moduli, tabelle, trigger, problemi |
| [TARGET.md](./TARGET.md) | Contesti delimitati, SoT, hub DAC |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Contratti API / eventi per i 4 sistemi |
| [MIGRATION.md](./MIGRATION.md) | Fasi di migrazione senza big-bang |

## Principio guida

> **DAC diventa l’hub operativo del percorso paziente e della raccolta eventi billable.**  
> I gestionali verticali restano **source of truth** del proprio dominio.  
> Ogni scrittura verso l’esterno passa da **outbox + adapter**, non da insert sparsi nelle pagine React.

```
┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐
│ Lab analisi │  │ Cliniche     │  │ Parafarmacia│  │ Fatturazione     │
│ (esterno)   │  │ (esterno)    │  │ (esterno)   │  │ Fatture in Cloud │
└──────▲──────┘  └──────▲───────┘  └──────▲──────┘  └────────▲─────────┘
       │                │                 │                   │
       └────────────────┴────────┬────────┴───────────────────┘
                                 │  adapters (Edge Functions)
                          ┌──────┴──────┐
                          │  Outbox +   │
                          │  Event Bus  │
                          └──────▲──────┘
                                 │
                    ┌────────────┴────────────┐
                    │   DAC Core (Supabase)   │
                    │  Paziente · Agenda ·    │
                    │  Eventi · Report hub    │
                    └─────────────────────────┘
```

## Codice scaffold (in repo)

- `src/domain/` — tipi dominio e ID canonici
- `src/integrations/ports/` — interfacce adapter (contratti)
- `src/integrations/events/` — eventi di dominio
- `src/integrations/outbox.ts` — enqueue best-effort (pazienti, agenda)
- `src/integrations/adapters/` — stub vendor
- `sql/integrations_foundation.sql` — tabelle `integration_*` + colonne source
- `sql/integrations_tag_sources.sql` — backfill + `v_billable_events`
- `supabase/functions/integration-outbox-worker/` — drain outbox (stub)

### Ordine deploy SQL
1. `sql/integrations_foundation.sql`
2. `sql/integrations_tag_sources.sql`

### Predisposizione runtime (Fase 0 → 1)

| Componente | Stato | Azione operativa |
|---|---|---|
| Outbox enqueue da UI | Pronto (best-effort) | Nessuna: se schema assente non blocca |
| Config → Integrazioni | UI read-only | Dopo SQL mostra seed da `integration_connections` |
| Worker Edge | Stub | Deploy + cron; `INTEGRATIONS_STUB_SEND=true` in sandbox |
| Adapter FiC / LIS / … | Stub TypeScript | Implementare in Edge, non in Vite |
| Report CSV ricavi | Include `source_system` | Utile dopo backfill tag_sources |

Prossima priorità consigliata: **Fatture in Cloud** su eventi `v_billable_events` (Fase 2), dopo MPI mapping (Fase 1).
