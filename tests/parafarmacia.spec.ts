import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, makeTestTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const createdCassaIds: string[] = [];
const createdRicaviCodici: string[] = [];
const createdCostiCodici: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => {
  // Cleanup: cancella PRIMA i mirror (potrebbero non avere FK ma cancello per ordine logico)
  for (const c of createdRicaviCodici.splice(0)) await sb.from('ricavi').delete().eq('codice', c);
  for (const c of createdCostiCodici.splice(0)) await sb.from('costi').delete().eq('codice', c);
  for (const id of createdCassaIds.splice(0)) await sb.from('parafarmacia_cassa').delete().eq('id', id);
});

test.describe('Parafarmacia', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Parafarmacia/);
    await expect(page.getByRole('heading', { name: 'Parafarmacia' })).toBeVisible();
  });

  test('REGRESSIONE bug A: una vendita parafarmacia genera un ricavo mirror CON IVA preservata', async () => {
    const tag = makeTestTag('PARF');
    const oggi = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.from('parafarmacia_cassa').insert({
      data: oggi,
      tipo: 'Entrata',
      importo: 100,
      metodo: 'Contanti',
      operatore_nome: 'Giovanni Scozzafava',
      descrizione: tag + ' vendita',
      imponibile: 90.91,
      aliquota_iva: 10,
      iva: 9.09,
      note: tag,
    }).select().single();
    expect(error, JSON.stringify(error)).toBeNull();
    createdCassaIds.push(data!.id);

    // Aspetta che il trigger giri
    await new Promise(r => setTimeout(r, 1500));

    // Il mirror in ricavi ha lo stesso codice basato su created_at
    const { data: ricavi } = await sb
      .from('ricavi')
      .select('*')
      .like('codice', 'PF-%')
      .gte('data', oggi)
      .lte('data', oggi)
      .like('servizio_nome', `%${tag}%`);
    expect(ricavi?.length, 'esattamente 1 mirror in ricavi').toBe(1);
    const mirror = ricavi![0] as any;
    createdRicaviCodici.push(mirror.codice);

    expect(Number(mirror.importo)).toBe(100);
    expect(Number(mirror.aliquota_iva)).toBe(10);
    expect(Number(mirror.iva)).toBeCloseTo(9.09, 2);
    expect(Number(mirror.imponibile)).toBeCloseTo(90.91, 2);
    expect(mirror.reparto).toBe('Parafarmacia');
  });

  test('REGRESSIONE bug A: una uscita parafarmacia genera un costo mirror CON IVA preservata', async () => {
    const tag = makeTestTag('PARFU');
    const oggi = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.from('parafarmacia_cassa').insert({
      data: oggi,
      tipo: 'Uscita',
      importo: 50,
      metodo: 'Contanti',
      operatore_nome: 'Giovanni Scozzafava',
      descrizione: tag + ' spesa',
      imponibile: 40.98,
      aliquota_iva: 22,
      iva: 9.02,
      note: tag,
    }).select().single();
    expect(error, JSON.stringify(error)).toBeNull();
    createdCassaIds.push(data!.id);

    await new Promise(r => setTimeout(r, 1500));

    const { data: costi } = await sb
      .from('costi')
      .select('*')
      .like('codice', 'PF-%')
      .eq('trigger_da', 'parafarmacia_cassa')
      .like('descrizione', `%${tag}%`);
    expect(costi?.length, 'esattamente 1 mirror in costi').toBe(1);
    const mirror = costi![0] as any;
    createdCostiCodici.push(mirror.codice);

    expect(Number(mirror.importo)).toBe(50);
    expect(Number(mirror.aliquota_iva)).toBe(22);
    expect(Number(mirror.iva)).toBeCloseTo(9.02, 2);
    expect(mirror.categoria).toBe('Forniture mediche');
  });

  test('REGRESSIONE bug #3: tab switch non azzera parafarmacia', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Parafarmacia/);
    await expect(page.getByRole('heading', { name: 'Parafarmacia' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
