import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, cleanupByTag, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const tags: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => { for (const t of tags.splice(0)) await cleanupByTag(sb, t); });

test.describe('Pacchetti', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Pacchetti/);
    await expect(page.getByRole('heading', { name: 'Pacchetti' })).toBeVisible();
  });

  test('un pacchetto creato via API è persistito e leggibile', async ({ authedPage: page }) => {
    const tag = makeTestTag('PCK');
    tags.push(tag);
    const { data, error } = await sb.from('pacchetti').insert({
      codice: 'PCK-' + Date.now(),
      nome_pacchetto: tag,
      servizio_nome: 'Pacchetto Test',
      sedute_totali: 5,
      sedute_fatte: 0,
      stato: 'Attivo',
      prezzo: 100,
      note: tag,
    }).select().single();
    expect(error, JSON.stringify(error)).toBeNull();
    expect(data?.id).toBeTruthy();

    // Verifico round-trip via API
    const { data: readBack } = await sb.from('pacchetti').select('*').eq('id', data!.id).single();
    expect(readBack?.nome_pacchetto).toBe(tag);
    expect(readBack?.prezzo).toBe(100);

    // E che la pagina si carichi senza errori
    await navigateViaSidebar(page, /Pacchetti/);
    await expect(page.getByRole('heading', { name: 'Pacchetti' })).toBeVisible();
  });

  test('REGRESSIONE bug #3: tab switch non azzera la pagina pacchetti', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Pacchetti/);
    await expect(page.getByRole('heading', { name: 'Pacchetti' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
    await expect(page.getByRole('heading', { name: 'Pacchetti' })).toBeVisible();
  });
});
