import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const EMAIL = process.env.DAC_TEST_EMAIL!;
const PASSWORD = process.env.DAC_TEST_PASSWORD!;
const SB_URL = 'https://yyjhuvftcwvnxlskvjne.supabase.co';
const SB_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amh1dmZ0Y3d2bnhsc2t2am5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDg1MDUsImV4cCI6MjA5MTcyNDUwNX0.MEohst7ka_cg_XtwLIbCRbxphxQghqYdFBDSkWMftas';

const OUT = path.join(process.cwd(), 'scout-output');
fs.mkdirSync(OUT, { recursive: true });
const save = (n: string, c: string) => fs.writeFileSync(path.join(OUT, n), c);

test('scout bug #2 — totali ricavi/parafarmacia/contabilita', async ({ page }) => {
  test.setTimeout(120_000);

  // --- UI login + raccogli quello che mostra l'app ---
  await page.goto('/');
  await page.getByRole('textbox', { name: 'nome@laboratoridac.it' }).fill(EMAIL);
  await page.getByRole('textbox', { name: '••••••••' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(
    page.getByRole('heading', { name: /Buongiorno|Buon pomeriggio|Buonasera/i })
  ).toBeVisible({ timeout: 20_000 });

  // Navigazione SPA cliccando i link della sidebar (no full reload → no re-mount LoginSplash)
  await page.getByRole('link', { name: /Report/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Contabilità' })).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '01-contabilita.png'), fullPage: true });
  save('01-contabilita.txt', await page.locator('body').innerText());

  await page.getByRole('link', { name: /Ricavi/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Ricavi' })).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '02-ricavi.png'), fullPage: true });
  save('02-ricavi.txt', await page.locator('body').innerText());

  await page.getByRole('link', { name: /Parafarmacia/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Parafarmacia' })).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '03-parafarmacia.png'), fullPage: true });
  save('03-parafarmacia.txt', await page.locator('body').innerText());

  // --- Dati grezzi da Supabase (client lato Node) ---
  const sb = createClient(SB_URL, SB_ANON);
  const { error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) {
    save('04-supabase-raw.json', JSON.stringify({ authErr }, null, 2));
    return;
  }
  // Aprile 2026 (mese con dati visibili sul trend) — formato YYYY-MM-DD locale, niente toISOString (timezone trap)
  const inizio = '2026-04-01';
  const fine = '2026-04-30';
  const [{ data: ricavi, error: e1 }, { data: paraf, error: e2 }] = await Promise.all([
    sb.from('ricavi').select('*').gte('data', inizio).lte('data', fine),
    sb.from('parafarmacia_cassa').select('*').gte('data', inizio).lte('data', fine),
  ]);

  const ricaviRows = ricavi ?? [];
  const parafRows = paraf ?? [];
  const totRicavi = ricaviRows.reduce((s, r: any) => s + Number(r.importo || 0), 0);
  const ricaviParaf = ricaviRows.filter(
    (r: any) =>
      (r.reparto || '').toLowerCase().includes('parafarm') ||
      (r.servizio_nome || '').toLowerCase().includes('parafarm')
  );
  const totRicaviParaf = ricaviParaf.reduce((s, r: any) => s + Number(r.importo || 0), 0);
  const totParaf = parafRows.reduce(
    (s, r: any) => s + Number(r.importo ?? r.totale ?? r.prezzo ?? 0),
    0
  );

  const summary = {
    periodo: { inizio, fine },
    ricavi_totale: totRicavi,
    ricavi_count: ricaviRows.length,
    ricavi_parafarmacia_count: ricaviParaf.length,
    ricavi_parafarmacia_totale: totRicaviParaf,
    parafarmacia_cassa_count: parafRows.length,
    parafarmacia_cassa_totale: totParaf,
    diff_parafarmacia: totRicaviParaf - totParaf,
    ricavi_sample: ricaviRows.slice(0, 5),
    ricavi_parafarmacia_sample: ricaviParaf.slice(0, 5),
    parafarmacia_sample: parafRows.slice(0, 5),
    errors: { e1, e2 },
  };
  save('04-supabase-raw.json', JSON.stringify(summary, null, 2));
  console.log(
    '\n=== BUG #2 SUMMARY ===\n' +
      `Periodo: ${inizio} → ${fine}\n` +
      `Ricavi totali mese:      €${totRicavi.toFixed(2)} (${ricaviRows.length} righe)\n` +
      `  di cui parafarmacia:   €${totRicaviParaf.toFixed(2)} (${ricaviParaf.length} righe)\n` +
      `Parafarmacia cassa mese: €${totParaf.toFixed(2)} (${parafRows.length} righe)\n` +
      `Differenza (mirror vs cassa): €${(totRicaviParaf - totParaf).toFixed(2)}\n` +
      `Se differenza == 0 → mirror 1:1 OK\n` +
      `Se differenza == +€${totParaf.toFixed(2)} → mirror duplicato (2x)\n`
  );
});
