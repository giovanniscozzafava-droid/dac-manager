# integration-outbox-worker

Edge Function che drena `integration_outbox` verso gli adapter esterni.

## Deploy

```bash
supabase functions deploy integration-outbox-worker
```

## Env (solo Edge, mai nel bundle Vite)

| Variabile | Ruolo |
|---|---|
| `SUPABASE_URL` | URL progetto |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (bypass RLS) |
| `INTEGRATIONS_STUB_SEND` | `true` = marca `sent` senza chiamare vendor (sandbox) |
| `OUTBOX_BATCH` | max righe per invocazione (default 20) |

## Schedulazione

Invocare con cron ogni 1–5 minuti (Supabase scheduled functions o cron esterno) con `POST` autenticato.

## Fase 0 vs dopo

- **Fase 0:** stub; con `INTEGRATIONS_STUB_SEND!=true` gli eventi restano `pending` con backoff.
- **Fasi successive:** sostituire `deliverStub` con adapter FiC / LIS / clinic / pharmacy.
