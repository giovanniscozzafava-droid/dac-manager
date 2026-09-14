import type { BillableChannel, IntegrationSystem, InvoiceStatus, Money, PatientRef, ServiceRef, UUID } from './types';

/** Movimento economico operativo (non è una fattura fiscale). */
export interface BillableEvent {
  id: UUID;
  occurredAt: string; // ISO date or timestamptz
  patient?: PatientRef | null;
  service?: ServiceRef | null;
  money: Money;
  channel: BillableChannel;
  sourceSystem: IntegrationSystem;
  sourceEventType: string;
  sourceExternalId?: string | null;
  invoiceStatus: InvoiceStatus;
  invoiceExternalId?: string | null;
  notes?: string | null;
  /** Link opzionale ad appuntamento / vendita / ordine lab locale */
  relatedAppointmentId?: UUID | null;
  relatedLocalId?: UUID | null;
}

export function moneyFromGross(gross: number, vatRate: number): Money {
  const net = vatRate === 0 ? gross : gross / (1 + vatRate / 100);
  const vatAmount = gross - net;
  return {
    gross: round2(gross),
    net: round2(net),
    vatRate,
    vatAmount: round2(vatAmount),
    currency: 'EUR',
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
