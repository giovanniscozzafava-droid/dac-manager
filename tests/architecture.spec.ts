import { test, expect } from '@playwright/test';
import { moneyFromGross } from '../src/domain/billing';
import {
  stubLabAdapter,
  stubInvoicingAdapter,
  lineFromGross,
} from '../src/integrations';

test.describe('Domain + integration ports', () => {
  test('moneyFromGross calcola imponibile e IVA', () => {
    const m = moneyFromGross(122, 22);
    expect(m.gross).toBe(122);
    expect(m.vatRate).toBe(22);
    expect(m.net).toBeCloseTo(100, 2);
    expect(m.vatAmount).toBeCloseTo(22, 2);
  });

  test('stub lab createOrder risponde queued', async () => {
    const r = await stubLabAdapter.createOrder({
      patient: { id: 'p1', displayName: 'Rossi Mario', codiceFiscale: 'RSSMRA80A01H501U' },
      examCodes: ['EMO'],
      priority: 'routine',
    });
    expect(r.status).toBe('queued');
    expect(r.externalOrderId).toBeTruthy();
  });

  test('stub invoicing createInvoice', async () => {
    const money = moneyFromGross(110, 10);
    const res = await stubInvoicingAdapter.createInvoice({
      client: { displayName: 'Rossi Mario', codiceFiscale: 'RSSMRA80A01H501U' },
      lines: [lineFromGross('Prestazione lab', money)],
      documentType: 'invoice',
      idempotencyKey: 'test-1',
    });
    expect(res.externalDocumentId).toBeTruthy();
  });
});
