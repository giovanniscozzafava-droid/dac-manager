import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, cleanupByTag, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const usedTags: string[] = [];

test.beforeAll(async () => {
  sb = await getAuthedSupabase();
});

test.afterEach(async () => {
  for (const tag of usedTags.splice(0)) {
    await cleanupByTag(sb, tag);
  }
});

test.describe('Pazienti', () => {
  test('apre la lista e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Pazienti/);
    await expect(page.getByRole('heading', { name: 'Pazienti' })).toBeVisible();
    await expect(page.getByPlaceholder(/Cerca cognome, nome/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuovo Paziente/i })).toBeVisible();
  });

  test('crea paziente via API, lo cerca nella UI e lo trova', async ({ authedPage: page }) => {
    const tag = makeTestTag('PAZ');
    usedTags.push(tag);
    // Crea via API (più affidabile del flow UI complesso del form pazienti)
    const cognome = tag.toUpperCase();
    const { error } = await sb.from('pazienti').insert({
      cognome,
      nome: 'MARIO',
      codice: 'PAZ-' + Date.now(),
    });
    expect(error, JSON.stringify(error)).toBeNull();

    await navigateViaSidebar(page, /Pazienti/);
    await expect(page.getByRole('heading', { name: 'Pazienti' })).toBeVisible();
    await page.getByPlaceholder(/Cerca cognome, nome/i).fill(cognome);
    await expect(page.getByText(`${cognome} MARIO`).first()).toBeVisible({ timeout: 10_000 });
  });

  test('la ricerca filtra: cognome inesistente → nessun risultato', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Pazienti/);
    await expect(page.getByRole('heading', { name: 'Pazienti' })).toBeVisible();
    await page.getByPlaceholder(/Cerca cognome, nome/i).fill('XYZXYZ_NON_ESISTE_99999');
    // La lista non deve avere risultati con quel testo
    await expect(page.getByText('XYZXYZ_NON_ESISTE_99999')).not.toBeVisible();
  });

  test('REGRESSIONE bug #3: tab switch non azzera la lista pazienti', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Pazienti/);
    await expect(page.getByRole('heading', { name: 'Pazienti' })).toBeVisible();
    await page.waitForTimeout(1500); // attesa caricamento lista
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
    await expect(page.getByRole('heading', { name: 'Pazienti' })).toBeVisible();
  });
});
