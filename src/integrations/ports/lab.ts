import type { PatientRef, UUID } from '../../domain/types';
import type { LabOrderRequestedPayload } from '../events/types';

export interface LabOrderResult {
  externalOrderId: string;
  status: 'accepted' | 'rejected' | 'queued';
  message?: string;
}

/**
 * Porta verso il software di laboratorio analisi (LIS).
 * Implementazioni concrete vivono in Edge Functions / adapters, non in React.
 */
export interface LabSystemPort {
  upsertPatient(patient: LabOrderRequestedPayload['patient'] & Record<string, unknown>): Promise<{ externalId: string }>;
  createOrder(input: LabOrderRequestedPayload): Promise<LabOrderResult>;
  cancelOrder(externalOrderId: string, reason?: string): Promise<void>;
  /** Opzionale: healthcheck connessione */
  ping?(): Promise<boolean>;
}

export type LabWebhookEvent =
  | { type: 'OrderAccepted'; externalOrderId: string; localAppointmentId?: UUID }
  | { type: 'ReportReady'; externalOrderId: string; reportUrl?: string; patient?: PatientRef }
  | { type: 'OrderRejected'; externalOrderId: string; reason: string };
