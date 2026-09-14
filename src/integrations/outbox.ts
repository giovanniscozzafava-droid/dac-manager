/**
 * Outbox integration — best-effort.
 * Se le tabelle non sono ancora migrate, fallisce in silenzio (dev/prod senza schema).
 * Non blocca mai il flusso UI operativo.
 */
import { supabase } from '@/lib/supabase'
import type { IntegrationSystem } from '@/domain/types'
import type { DomainEventType } from './events/types'

export interface EnqueueOutboxInput {
  system: IntegrationSystem
  eventType: DomainEventType | string
  aggregateType: string
  aggregateId?: string | null
  payload: Record<string, unknown>
  /** Chiave stabile per idempotenza; default = system:event:aggregate:ts-bucket */
  idempotencyKey?: string
}

let schemaMissingLogged = false

export async function enqueueOutbox(input: EnqueueOutboxInput): Promise<boolean> {
  if (input.system === 'dac') {
    console.warn('[outbox] system=dac non è un target valido; usa lab|clinic|pharmacy|invoicing|email')
    return false
  }

  const idempotencyKey =
    input.idempotencyKey ||
    `${input.system}:${input.eventType}:${input.aggregateId || 'na'}:${bucketMinute()}`

  const { error } = await supabase.from('integration_outbox').insert({
    system: input.system,
    event_type: input.eventType,
    aggregate_type: input.aggregateType,
    aggregate_id: input.aggregateId || null,
    payload: {
      ...input.payload,
      _origin: 'dac',
      _enqueued_at: new Date().toISOString(),
    },
    idempotency_key: idempotencyKey,
    status: 'pending',
  })

  if (error) {
    // 42P01 undefined_table / PGRST205 missing from schema cache
    const msg = error.message || ''
    if (/does not exist|schema cache|integration_outbox/i.test(msg)) {
      if (!schemaMissingLogged) {
        console.info('[outbox] schema non ancora migrato — enqueue ignorato')
        schemaMissingLogged = true
      }
      return false
    }
    // Unique violation = già in coda (ok)
    if (/duplicate|unique/i.test(msg)) return true
    console.warn('[outbox] enqueue failed:', error.message)
    return false
  }
  return true
}

/** Fan-out tipico dopo upsert paziente: lab + clinica + fatturazione (+ opz. pharmacy). */
export async function enqueuePatientUpserted(patient: {
  id: string
  nome: string
  cognome: string
  codice_fiscale?: string | null
  email?: string | null
  telefono?: string | null
  sesso?: string | null
  data_nascita?: string | null
}): Promise<void> {
  const payload = {
    patient: {
      id: patient.id,
      displayName: `${patient.cognome} ${patient.nome}`.trim(),
      codiceFiscale: patient.codice_fiscale || null,
      nome: patient.nome,
      cognome: patient.cognome,
      email: patient.email || null,
      telefono: patient.telefono || null,
      sesso: patient.sesso || null,
      dataNascita: patient.data_nascita || null,
    },
  }
  const keyBase = `PatientUpserted:${patient.id}:${patient.codice_fiscale || 'nocf'}`
  await Promise.all([
    enqueueOutbox({
      system: 'lab',
      eventType: 'PatientUpserted',
      aggregateType: 'patient',
      aggregateId: patient.id,
      payload,
      idempotencyKey: `lab:${keyBase}`,
    }),
    enqueueOutbox({
      system: 'clinic',
      eventType: 'PatientUpserted',
      aggregateType: 'patient',
      aggregateId: patient.id,
      payload,
      idempotencyKey: `clinic:${keyBase}`,
    }),
    enqueueOutbox({
      system: 'invoicing',
      eventType: 'PatientUpserted',
      aggregateType: 'patient',
      aggregateId: patient.id,
      payload,
      idempotencyKey: `invoicing:${keyBase}`,
    }),
  ])
}

export async function enqueueAppointmentLifecycle(
  eventType: 'AppointmentCompleted' | 'AppointmentNoShow' | 'AppointmentCancelled' | 'AppointmentScheduled',
  appointment: Record<string, unknown> & { id: string }
): Promise<void> {
  await enqueueOutbox({
    system: 'clinic',
    eventType,
    aggregateType: 'appointment',
    aggregateId: appointment.id,
    payload: { appointment },
    idempotencyKey: `clinic:${eventType}:${appointment.id}`,
  })
  // Lab: solo se reparto/servizio lab — il worker filtrerà; qui segnaliamo completion
  if (eventType === 'AppointmentCompleted') {
    await enqueueOutbox({
      system: 'lab',
      eventType: 'LabOrderRequested',
      aggregateType: 'appointment',
      aggregateId: appointment.id,
      payload: {
        appointmentId: appointment.id,
        patient: {
          id: appointment.paziente_id || null,
          displayName: appointment.paziente_nome || '',
        },
        examCodes: [],
        serviceName: appointment.servizio_nome || null,
        note: 'Pending catalog mapping servizi↔LIS',
      },
      idempotencyKey: `lab:LabOrderRequested:${appointment.id}`,
    })
  }
}

function bucketMinute(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`
}
