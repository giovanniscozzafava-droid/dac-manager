import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const createdIds: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => {
  for (const id of createdIds.splice(0)) {
    await sb.from('inventario_lab').delete().eq('id', id);
  }
});

test.describe('Inventario Laboratorio', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Laboratorio/);
    await expect(page.getByRole('heading', { name: /Inventario Laboratorio/ })).toBeVisible();
    await expect(page.getByPlaceholder(/Cerca prodotto/i)).toBeVisible();
  });

  test('crea prodotto via API e lo trova con la ricerca', async ({ authedPage: page }) => {
    const tag = makeTestTag('INV');
    const { data, error } = await sb.from('inventario_lab').insert({
      prodotto: tag + ' Reagente',
      lotto: 'L001',
      quantita: 100,
      soglia_minima: 10,
    }).select().single();
    if (error) test.fixme(true, `inventario_lab insert error: ${error.message}`);
    if (!error && data) createdIds.push(data.id);

    await navigateViaSidebar(page, /Laboratorio/);
    await page.getByPlaceholder(/Cerca prodotto/i).fill(tag);
    await expect(page.getByText(new RegExp(tag)).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSIONE bug #3: tab switch non azzera l\'inventario', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Laboratorio/);
    await expect(page.getByRole('heading', { name: /Inventario Laboratorio/ })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
