import { test } from '@playwright/test';
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

test('scout schema appuntamenti + valori stato', async () => {
  const sb = createClient(SB_URL, SB_ANON);
  await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

  const { data: appuntamenti, error } = await sb
    .from('appuntamenti')
    .select('*')
    .order('data', { ascending: false })
    .limit(20);

  if (error) {
    fs.writeFileSync(path.join(OUT, '07-appuntamenti-schema.json'), JSON.stringify({ error }, null, 2));
    throw error;
  }

  // Trova un esempio per ogni stato distinto
  const stati = new Set((appuntamenti ?? []).map((a: any) => a.stato).filter(Boolean));
  const sampleByStato: Record<string, any> = {};
  for (const s of stati) {
    sampleByStato[s as string] = (appuntamenti ?? []).find((a: any) => a.stato === s);
  }

  // Per ciascun appuntamento "Completato" cerca ricavi linkati per id
  const completati = (appuntamenti ?? []).filter((a: any) => /comp/i.test(a.stato || ''));
  const ricaviLinkSamples: any[] = [];
  for (const app of completati.slice(0, 5)) {
    const { data: ricaviLink } = await sb.from('ricavi').select('*').eq('appuntamento_id', app.id);
    ricaviLinkSamples.push({
      appuntamento_id: app.id,
      paziente: app.paziente_nome,
      data: app.data,
      stato: app.stato,
      ricavi_count: (ricaviLink ?? []).length,
      ricavi: ricaviLink,
    });
  }

  const summary = {
    total: appuntamenti?.length ?? 0,
    stati_distinti: Array.from(stati),
    columns: appuntamenti?.[0] ? Object.keys(appuntamenti[0]) : [],
    sample_by_stato: sampleByStato,
    completati_link_ricavi: ricaviLinkSamples,
  };

  fs.writeFileSync(path.join(OUT, '07-appuntamenti-schema.json'), JSON.stringify(summary, null, 2));

  console.log(
    '\n=== APPUNTAMENTI SCHEMA ===\n' +
      `Righe lette: ${appuntamenti?.length ?? 0}\n` +
      `Colonne: ${summary.columns.join(', ')}\n` +
      `Stati distinti: ${summary.stati_distinti.join(' | ')}\n` +
      `Appuntamenti completati esaminati: ${completati.length}\n` +
      ricaviLinkSamples
        .map(
          (s) =>
            `  • ${s.paziente || '(no nome)'} ${s.data} stato="${s.stato}" → ricavi linkati: ${s.ricavi_count}`
        )
        .join('\n') +
      '\n'
  );
});
