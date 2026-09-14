/**
 * Test helper report (puro, senza login).
 * Verifica aggregazioni e che le API di export siano esportate.
 */
import { test, expect } from '@playwright/test';
import {
  euro,
  aggregateMetodi,
  exportRicaviCsv,
  exportCostiCsv,
  exportRiepilogoCsv,
  exportLaboratorioCsv,
  exportAccountingPdf,
} from '../src/lib/reports';

test.describe('Report helpers', () => {
  test('euro formatta all\'italiana con 2 decimali', () => {
    const s = euro(1234.5);
    expect(s).toContain('234');
    expect(s).toMatch(/,50$/);
  });

  test('aggregateMetodi raggruppa per metodo', () => {
    const m = aggregateMetodi([
      { data: '2026-09-01', importo: 100, metodo: 'POS' },
      { data: '2026-09-02', importo: 50, metodo: 'POS' },
      { data: '2026-09-03', importo: 20, metodo: null },
    ]);
    expect(m.find(x => x.name === 'POS')?.value).toBe(150);
    expect(m.find(x => x.name === 'Non specificato')?.value).toBe(20);
  });

  test('API export sono funzioni', () => {
    expect(typeof exportRicaviCsv).toBe('function');
    expect(typeof exportCostiCsv).toBe('function');
    expect(typeof exportRiepilogoCsv).toBe('function');
    expect(typeof exportLaboratorioCsv).toBe('function');
    expect(typeof exportAccountingPdf).toBe('function');
  });
});
