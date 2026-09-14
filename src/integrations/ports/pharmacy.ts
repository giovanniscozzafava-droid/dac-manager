import type { Money, PatientRef } from '../../domain/types';

export interface PharmacySystemPort {
  /** Di norma la parafarmacia è SoT: DAC riceve eventi, non crea vendite. */
  upsertPatient?(patient: PatientRef & Record<string, unknown>): Promise<{ externalId: string }>;
  ping?(): Promise<boolean>;
}

export type PharmacyWebhookEvent =
  | {
      type: 'SaleRecorded';
      externalSaleId: string;
      description: string;
      money: Money;
      paymentMethod?: string;
      patient?: PatientRef;
      occurredAt: string;
    }
  | {
      type: 'SaleVoided';
      externalSaleId: string;
      reason?: string;
      occurredAt: string;
    }
  | {
      type: 'PurchaseRecorded';
      externalId: string;
      description: string;
      money: Money;
      occurredAt: string;
    };
