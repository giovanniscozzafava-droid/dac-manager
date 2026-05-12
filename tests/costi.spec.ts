import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const createdIds: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => {
  for (const id of createdIds.splice(0)) await sb.from('costi').delete().eq('id', id);
});

test.describe('Costi', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Costi/);
    await expect(page.getByRole('heading', { name: 'Costi' })).toBeVisible();
    await expect(page.getByPlaceholder(/Cerca/i).first()).toBeVisible();
  });

  test('crea un costo via API e lo trova in lista filtrata', async ({ authedPage: page }) => {
    const tag = makeTestTag('CST');
    const oggi = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.from('costi').insert({
      codice: 'CST-' + Date.now(),
      data: oggi,
      categoria: 'Forniture mediche',
      descrizione: tag + ' acquisto test',
      importo: 42.5,
      metodo: 'Contanti',
      note: tag,
    }).select().single();
    expect(error, JSON.stringify(error)).toBeNull();
    createdIds.push(data!.id);

    await navigateViaSidebar(page, /Costi/);
    await page.waitForTimeout(1500);
    await page.getByPlaceholder(/Cerca/i).first().fill(tag);
    await expect(page.getByText(new RegExp(tag)).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSIONE bug #3: tab switch non azzera costi', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Costi/);
    await expect(page.getByRole('heading', { name: 'Costi' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
