/**
 * Identità canoniche del dominio DAC (hub).
 * Gli ID esterni vivono in integration_external_ids, non qui.
 */

export type UUID = string;

export type IntegrationSystem =
  | 'dac'
  | 'lab'
  | 'clinic'
  | 'pharmacy'
  | 'invoicing'
  | 'email';

export type BillableChannel =
  | 'lab'
  | 'clinic'
  | 'pharmacy'
  | 'agenda'
  | 'presidio'
  | 'manual';

export type InvoiceStatus =
  | 'none'
  | 'pending'
  | 'sent'
  | 'invoiced'
  | 'error'
  | 'void';

export interface Money {
  /** Importo lordo (ivato) in EUR */
  gross: number;
  net: number;
  vatRate: number;
  vatAmount: number;
  currency: 'EUR';
}

export interface PatientRef {
  id: UUID;
  codiceFiscale?: string | null;
  displayName: string;
}

export interface ServiceRef {
  id?: UUID | null;
  code?: string | null;
  name: string;
  department?: string | null;
}
