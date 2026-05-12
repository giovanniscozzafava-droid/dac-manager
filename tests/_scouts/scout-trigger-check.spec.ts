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

test('verifica cleanup + check trigger appuntamento→ricavo mai funzionato', async () => {
  const sb = createClient(SB_URL, SB_ANON);
  await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

  // 1) Eventuali __TEST_ rimasti dopo crash
  const { data: orphans } = await sb
    .from('appuntamenti')
    .select('id, note, paziente_nome, stato, created_at')
    .like('note', '__TEST_BUG1_%');

  // 2) Quanti ricavi storici hanno appuntamento_id non null?
  const { data: ricaviConApp, count } = await sb
    .from('ricavi')
    .select('id, codice, data, appuntamento_id, servizio_nome, importo', { count: 'exact' })
    .not('appuntamento_id', 'is', null)
    .limit(20);

  // 3) Quanti appuntamenti totali nel sistema, per stato
  const { data: tuttiAppuntamenti } = await sb.from('appuntamenti').select('stato');
  const perStato: Record<string, number> = {};
  for (const a of tuttiAppuntamenti ?? []) {
    perStato[(a as any).stato || '(null)'] = (perStato[(a as any).stato || '(null)'] || 0) + 1;
  }

  const summary = {
    cleanup_orphans: orphans?.length ?? 0,
    cleanup_details: orphans,
    ricavi_con_appuntamento_id_total: count,
    ricavi_con_appuntamento_id_sample: ricaviConApp,
    appuntamenti_per_stato: perStato,
  };
  fs.writeFileSync(path.join(OUT, '09-trigger-check.json'), JSON.stringify(summary, null, 2));

  console.log(
    '\n=== TRIGGER CHECK ===\n' +
      `Orphan __TEST_ rimasti: ${summary.cleanup_orphans}\n` +
      `Ricavi con appuntamento_id nel DB (storico totale): ${count}\n` +
      `Distribuzione stato appuntamenti:\n` +
      Object.entries(perStato).map(([s, n]) => `  • ${s}: ${n}`).join('\n') +
      '\n'
  );

  // 4) Pulisci eventuali orfani
  if ((orphans?.length ?? 0) > 0) {
    for (const o of orphans!) {
      await sb.from('ricavi').delete().eq('appuntamento_id', (o as any).id);
      await sb.from('appuntamenti').delete().eq('id', (o as any).id);
    }
    console.log(`Pulizia: rimossi ${orphans!.length} appuntamenti __TEST_ orfani`);
  }
});
