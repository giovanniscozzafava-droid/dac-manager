import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';
import { getAuthedSupabase, makeTestTag, cleanupByTag } from './helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient;
const createdAppIds: string[] = [];
const tags: string[] = [];

test.beforeAll(async () => { sb = await getAuthedSupabase(); });
test.afterEach(async () => {
  for (const id of createdAppIds.splice(0)) {
    await sb.from('ricavi').delete().eq('appuntamento_id', id);
    await sb.from('appuntamenti').delete().eq('id', id);
  }
  for (const t of tags.splice(0)) await cleanupByTag(sb, t);
});

test.describe('Agenda', () => {
  test('apre l\'agenda e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Agenda/i);
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  });

  test('appuntamento creato via API è persistito e leggibile', async ({ authedPage: page }) => {
    const tag = makeTestTag('AGN');
    tags.push(tag);
    const oggi = new Date().toISOString().slice(0, 10);
    const payload = {
      paziente_nome: tag + ' Mario',
      servizio_nome: 'Visita di prova',
      operatore_nome: 'Giovanni Scozzafava',
      data: oggi,
      ora: '14:00',
      durata_minuti: 30,
      stato: 'Prenotato',
      colonna_agenda: 2,
      note: tag,
    };
    const { data, error } = await sb.from('appuntamenti').insert(payload).select().single();
    expect(error, JSON.stringify(error)).toBeNull();
    expect(data?.id).toBeTruthy();
    createdAppIds.push(data!.id);

    // L'appuntamento deve essere letto via la stessa interfaccia che usa la UI
    const { data: readBack } = await sb.from('appuntamenti').select('*').eq('id', data!.id).single();
    expect(readBack?.paziente_nome).toBe(payload.paziente_nome);
    expect(readBack?.data).toBe(oggi);

    // La pagina Agenda è raggiungibile e non in stato di errore
    await navigateViaSidebar(page, /Agenda/i);
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  });

  test('REGRESSIONE bug #1: completare un appuntamento crea 1 sola riga ricavi (idempotente)', async ({ authedPage: _page }) => {
    const tag = makeTestTag('AGN1');
    tags.push(tag);

    const oggi = new Date().toISOString().slice(0, 10);
    const { data: app, error: insErr } = await sb.from('appuntamenti').insert({
      paziente_nome: tag + ' Test',
      servizio_nome: 'Visita prova',
      operatore_nome: 'Giovanni Scozzafava',
      data: oggi,
      ora: '15:00',
      durata_minuti: 30,
      stato: 'Prenotato',
      importo: 50,
      note: tag,
    }).select().single();
    expect(insErr, JSON.stringify(insErr)).toBeNull();
    const appId = app!.id;
    createdAppIds.push(appId);

    // 1° complete
    const { error: u1 } = await sb.from('appuntamenti').update({
      stato: 'Completato',
      completato_at: new Date().toISOString(),
    }).eq('id', appId);
    expect(u1, JSON.stringify(u1)).toBeNull();
    await new Promise(r => setTimeout(r, 1500));
    const { data: ricavi1 } = await sb.from('ricavi').select('*').eq('appuntamento_id', appId);
    expect(ricavi1?.length, 'dopo 1° complete deve esistere 1 sola riga ricavi').toBe(1);

    // 2° complete (idempotenza)
    const { error: u2 } = await sb.from('appuntamenti').update({
      stato: 'Completato',
      completato_at: new Date().toISOString(),
    }).eq('id', appId);
    expect(u2, JSON.stringify(u2)).toBeNull();
    await new Promise(r => setTimeout(r, 1500));
    const { data: ricavi2 } = await sb.from('ricavi').select('*').eq('appuntamento_id', appId);
    expect(ricavi2?.length, 'dopo 2° complete deve restare 1 sola riga (no duplicati)').toBe(1);
  });

  test('REGRESSIONE bug #3: tab switch non azzera l\'agenda', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Agenda/i);
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  });
});
