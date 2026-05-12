import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
test.beforeAll(async () => { sb = await getAuthedSupabase(); });

test.describe('Contabilità (Report)', () => {
  test('apre la pagina e mostra l\'header + tab', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Report/);
    await expect(page.getByRole('heading', { name: 'Contabilità' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Conto Economico/ })).toBeVisible();
  });

  test('REGRESSIONE bug #2: il TOTALE RICAVI mostrato in pagina = somma diretta della tabella ricavi (no double-count)', async ({ authedPage: page }) => {
    // Calcola via API la somma "vera" per il mese corrente
    const now = new Date();
    const inizio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const fine = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data: ricavi } = await sb.from('ricavi').select('importo').gte('data', inizio).lte('data', fine);
    const totaleAtteso = (ricavi ?? []).reduce((s, r: any) => s + Number(r.importo || 0), 0);

    await navigateViaSidebar(page, /Report/);
    await expect(page.getByRole('heading', { name: 'Contabilità' })).toBeVisible();
    await page.waitForTimeout(2500);
    // Vai sul tab Conto Economico (PLTab) dove c'è la riga "TOTALE RICAVI"
    await page.getByRole('button', { name: /Conto Economico/ }).click();
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').innerText();
    // Estrae le €X (locale IT, può avere . come migliaia o , come decimali)
    const totaleFormatted = `€${totaleAtteso.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`;
    // Tolleranza: la pagina arrotonda; verifico solo che il totale ricavi sia presente come stringa
    const found = bodyText.includes(totaleFormatted) || bodyText.includes(`€${totaleAtteso.toFixed(0)}`);
    expect(found, `attendo TOTALE RICAVI ≈ ${totaleFormatted} in pagina`).toBe(true);
  });

  test('REGRESSIONE bug #3: tab switch non azzera la contabilità', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Report/);
    await expect(page.getByRole('heading', { name: 'Contabilità' })).toBeVisible();
    await page.waitForTimeout(2000);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
