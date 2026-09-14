// supabase/functions/integration-outbox-worker/index.ts
// Drain integration_outbox → adapter stub (Fase 0).
// Deploy: supabase functions deploy integration-outbox-worker
// Cron consigliato: ogni 1–5 minuti (Supabase scheduled functions / esterno).
//
// IMPORTANTE: i secret vendor (FiC OAuth, LIS API key) vivono SOLO qui in Deno.env.
// Questo worker in Fase 0 marca gli eventi come "sent" solo in modalità stub,
// oppure lascia pending se INTEGRATIONS_STUB_SEND !== 'true'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STUB_SEND = Deno.env.get('INTEGRATIONS_STUB_SEND') === 'true'
const BATCH = Number(Deno.env.get('OUTBOX_BATCH') || '20')

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

type OutboxRow = {
  id: string
  system: string
  event_type: string
  payload: Record<string, unknown>
  attempts: number
}

async function deliverStub(row: OutboxRow): Promise<{ ok: boolean; detail: string }> {
  // Qui entreranno: FattureInCloudAdapter, LabAdapter, ecc.
  console.log('[outbox-worker] stub deliver', row.system, row.event_type, row.id)
  return { ok: true, detail: 'stub-delivered' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { data: rows, error } = await sb
      .from('integration_outbox')
      .select('id, system, event_type, payload, attempts')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH)

    if (error) throw error

    const results: Array<{ id: string; status: string; detail?: string }> = []

    for (const row of (rows || []) as OutboxRow[]) {
      await sb
        .from('integration_outbox')
        .update({ status: 'processing', attempts: (row.attempts || 0) + 1 })
        .eq('id', row.id)

      if (!STUB_SEND) {
        // Schema pronto, adapter non ancora: rimetti in pending con backoff
        const next = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        await sb
          .from('integration_outbox')
          .update({
            status: 'pending',
            next_attempt_at: next,
            last_error: 'waiting_for_adapter',
          })
          .eq('id', row.id)
        results.push({ id: row.id, status: 'deferred', detail: 'INTEGRATIONS_STUB_SEND!=true' })
        continue
      }

      const delivered = await deliverStub(row)
      if (delivered.ok) {
        await sb
          .from('integration_outbox')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', row.id)
        results.push({ id: row.id, status: 'sent', detail: delivered.detail })
      } else {
        const attempts = (row.attempts || 0) + 1
        await sb
          .from('integration_outbox')
          .update({
            status: attempts >= 8 ? 'dead' : 'failed',
            last_error: delivered.detail,
            next_attempt_at: new Date(Date.now() + Math.min(attempts, 6) * 5 * 60 * 1000).toISOString(),
          })
          .eq('id', row.id)
        results.push({ id: row.id, status: 'failed', detail: delivered.detail })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
