import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const createdIds: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => {
  for (const id of createdIds.splice(0)) await sb.from('ricavi').delete().eq('id', id);
});

test.describe('Ricavi', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Ricavi/);
    await expect(page.getByRole('heading', { name: 'Ricavi' })).toBeVisible();
    await expect(page.getByPlaceholder(/Cerca/i).first()).toBeVisible();
  });

  test('crea un ricavo via API e lo trova in lista', async ({ authedPage: page }) => {
    const tag = makeTestTag('RIC');
    const oggi = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.from('ricavi').insert({
      codice: 'RIC-' + Date.now(),
      data: oggi,
      paziente_nome: tag + ' Test',
      servizio_nome: tag + ' visita',
      reparto: 'Laboratorio',
      operatore_nome: 'Giovanni Scozzafava',
      importo: 75,
      metodo: 'Contanti',
      note: tag,
    }).select().single();
    expect(error, JSON.stringify(error)).toBeNull();
    createdIds.push(data!.id);

    await navigateViaSidebar(page, /Ricavi/);
    await page.waitForTimeout(1500);
    await page.getByPlaceholder(/Cerca/i).first().fill(tag);
    await expect(page.getByText(new RegExp(tag)).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSIONE bug #3: tab switch non azzera ricavi', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Ricavi/);
    await expect(page.getByRole('heading', { name: 'Ricavi' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
