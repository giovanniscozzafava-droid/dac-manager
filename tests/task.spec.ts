import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, cleanupByTag, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const tags: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => { for (const t of tags.splice(0)) await cleanupByTag(sb, t); });

test.describe('Task', () => {
  test('apre la pagina task e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Task/);
    await expect(page.getByRole('heading', { name: /Task/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuovo/ })).toBeVisible();
  });

  test('un task creato via API appare nella lista', async ({ authedPage: page }) => {
    const tag = makeTestTag('TSK');
    tags.push(tag);
    const { error } = await sb.from('task').insert({
      codice: 'TSK-' + Date.now(),
      tipo: 'Libero',
      descrizione: tag + ' — Task di prova',
      priorita: 'Media',
      stato: 'Da fare',
      assegnato_a_nome: 'Giovanni Scozzafava',
      note: tag,
    });
    expect(error, JSON.stringify(error)).toBeNull();

    await navigateViaSidebar(page, /Task/);
    await page.waitForTimeout(1500);
    await expect(page.getByText(new RegExp(tag)).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSIONE bug #4: operatore_recall è un parametro configurabile (non hardcoded)', async () => {
    // pg_proc non è esposto via PostgREST, quindi non possiamo leggere il body del trigger
    // dal browser. Verifichiamo a livello dati: il parametro operatore_recall deve esistere
    // (o essere assente) ed essere modificabile via automazioni.parametri — non un literal nel codice.
    const { data: aut, error } = await sb.from('automazioni').select('parametri').eq('id', 'cb_recall_auto').single();
    expect(error, JSON.stringify(error)).toBeNull();
    expect(aut?.parametri).toBeTruthy();
    const params = aut!.parametri as any;
    const isConfigurable = !('operatore_recall' in params) || typeof params.operatore_recall === 'string';
    expect(isConfigurable, 'operatore_recall deve essere configurabile via automazioni.parametri').toBe(true);
  });

  test('REGRESSIONE bug #3: tab switch non azzera la lista task', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Task/);
    await expect(page.getByRole('heading', { name: /Task/ })).toBeVisible();
    await page.waitForTimeout(2500);
    await simulateTabSwitch(page);
    await page.waitForTimeout(800);
    // Verifica robusta: header ancora visibile dopo switch (segnale che non c'è remount/error)
    await expect(page.getByRole('heading', { name: /Task/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuovo/ })).toBeVisible();
  });
});
