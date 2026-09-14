import type { BillableChannel, IntegrationSystem, Money, PatientRef, ServiceRef, UUID } from '../../domain/types';

export type DomainEventType =
  | 'PatientUpserted'
  | 'AppointmentScheduled'
  | 'AppointmentCompleted'
  | 'AppointmentNoShow'
  | 'AppointmentCancelled'
  | 'LabOrderRequested'
  | 'LabReportReady'
  | 'ClinicVisitCompleted'
  | 'PharmacySaleRecorded'
  | 'PharmacySaleVoided'
  | 'BillableEventCreated'
  | 'InvoiceRequested'
  | 'InvoiceIssued'
  | 'InvoiceFailed'
  | 'AnamnesiSubmitted';

export interface DomainEventBase {
  id: UUID;
  type: DomainEventType;
  occurredAt: string;
  aggregateType: string;
  aggregateId: UUID;
  correlationId?: string;
  payload: Record<string, unknown>;
}

export interface PatientUpsertedPayload {
  patient: PatientRef & {
    nome: string;
    cognome: string;
    sesso?: string | null;
    dataNascita?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
}

export interface AppointmentCompletedPayload {
  appointmentId: UUID;
  patient?: PatientRef | null;
  service: ServiceRef;
  operatorName?: string | null;
  money: Money;
  channel: BillableChannel;
}

export interface PharmacySalePayload {
  saleExternalId: string;
  patient?: PatientRef | null;
  description: string;
  money: Money;
  paymentMethod?: string | null;
}

export interface InvoiceRequestedPayload {
  billableEventIds: UUID[];
  clientHint?: { codiceFiscale?: string; partitaIva?: string; displayName: string };
  documentType: 'invoice' | 'receipt' | 'credit_note';
}

export interface LabOrderRequestedPayload {
  patient: PatientRef;
  examCodes: string[];
  appointmentId?: UUID | null;
  priority?: 'routine' | 'urgent';
}
