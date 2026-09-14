import type { PatientRef, UUID } from '../../domain/types';

export interface ClinicAppointmentSync {
  localAppointmentId: UUID;
  startsAt: string;
  endsAt?: string;
  patient: PatientRef;
  serviceName: string;
  operatorName?: string | null;
  status: string;
}

export interface ClinicSystemPort {
  upsertPatient(patient: PatientRef & Record<string, unknown>): Promise<{ externalId: string }>;
  syncAppointment?(input: ClinicAppointmentSync): Promise<{ externalId: string }>;
  pushAnamnesiLink?(input: {
    patient: PatientRef;
    documentUrl: string;
    specialty?: string;
  }): Promise<void>;
  ping?(): Promise<boolean>;
}

export type ClinicWebhookEvent =
  | { type: 'VisitCompleted'; externalVisitId: string; patient?: PatientRef; amountGross?: number; vatRate?: number }
  | { type: 'AppointmentChanged'; externalAppointmentId: string; status: string; startsAt?: string };
