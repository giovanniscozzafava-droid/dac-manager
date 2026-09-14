import type { Money, UUID } from '../../domain/types';

export interface InvoicingClient {
  displayName: string;
  codiceFiscale?: string | null;
  partitaIva?: string | null;
  email?: string | null;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
  };
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  /** Riferimento a billable_event locale per riconciliazione */
  billableEventId?: UUID;
}

export interface CreateInvoiceInput {
  client: InvoicingClient;
  clientExternalId?: string;
  lines: InvoiceLine[];
  documentType: 'invoice' | 'receipt' | 'credit_note';
  notes?: string;
  /** Idempotency key stabile (es. hash degli event id) */
  idempotencyKey: string;
}

export interface CreateInvoiceResult {
  externalDocumentId: string;
  number?: string;
  status: string;
}

/**
 * Porta verso Fatture in Cloud (o altro gestionale fatturazione).
 * Auth OAuth2 / token: solo in Edge Function secrets.
 */
export interface InvoicingPort {
  ensureClient(client: InvoicingClient): Promise<{ externalId: string }>;
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  createCreditNote?(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  getDocument?(externalDocumentId: string): Promise<{ status: string; number?: string }>;
  ping?(): Promise<boolean>;
}

/** Helper: da Money lordo + descrizione a riga fattura netta. */
export function lineFromGross(description: string, money: Money, billableEventId?: UUID): InvoiceLine {
  return {
    description,
    quantity: 1,
    unitPriceNet: money.net,
    vatRate: money.vatRate,
    billableEventId,
  };
}
