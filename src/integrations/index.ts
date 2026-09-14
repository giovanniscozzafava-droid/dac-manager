export type { IntegrationSystem, BillableChannel, InvoiceStatus, Money, PatientRef, ServiceRef, UUID } from '../domain/types';
export { moneyFromGross } from '../domain/billing';
export type { BillableEvent } from '../domain/billing';

export type { DomainEventType, DomainEventBase } from './events/types';
export type { LabSystemPort, LabWebhookEvent } from './ports/lab';
export type { ClinicSystemPort, ClinicWebhookEvent } from './ports/clinic';
export type { PharmacySystemPort, PharmacyWebhookEvent } from './ports/pharmacy';
export type { InvoicingPort, CreateInvoiceInput, CreateInvoiceResult } from './ports/invoicing';
export { lineFromGross } from './ports/invoicing';
export {
  stubLabAdapter,
  stubClinicAdapter,
  stubPharmacyAdapter,
  stubInvoicingAdapter,
} from './adapters/stubs';
