/**
 * Adapter stub: nessun vendor collegato.
 * Utile in dev/test per verificare che l'application layer chiami i port
 * senza toccare HTTP reali.
 */
import type { LabSystemPort } from '../ports/lab';
import type { ClinicSystemPort } from '../ports/clinic';
import type { PharmacySystemPort } from '../ports/pharmacy';
import type { InvoicingPort } from '../ports/invoicing';

export const stubLabAdapter: LabSystemPort = {
  async upsertPatient() {
    return { externalId: 'stub-lab-patient' };
  },
  async createOrder() {
    return { externalOrderId: 'stub-lab-order', status: 'queued', message: 'stub' };
  },
  async cancelOrder() {},
  async ping() {
    return true;
  },
};

export const stubClinicAdapter: ClinicSystemPort = {
  async upsertPatient() {
    return { externalId: 'stub-clinic-patient' };
  },
  async ping() {
    return true;
  },
};

export const stubPharmacyAdapter: PharmacySystemPort = {
  async ping() {
    return true;
  },
};

export const stubInvoicingAdapter: InvoicingPort = {
  async ensureClient() {
    return { externalId: 'stub-fic-client' };
  },
  async createInvoice(input) {
    return {
      externalDocumentId: 'stub-fic-doc',
      number: 'STUB/1',
      status: 'draft',
    };
  },
  async ping() {
    return true;
  },
};
