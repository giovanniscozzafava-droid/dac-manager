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

test('scout uscite parafarmacia → finiscono nei costi?', async () => {
  const sb = createClient(SB_URL, SB_ANON);
  const { error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) throw authErr;

  const inizio = '2026-04-01';
  const fine = '2026-04-30';

  const [{ data: cassa }, { data: costi }] = await Promise.all([
    sb.from('parafarmacia_cassa').select('*').gte('data', inizio).lte('data', fine),
    sb.from('costi').select('*').gte('data', inizio).lte('data', fine),
  ]);

  const uscite = (cassa ?? []).filter((r: any) => r.tipo === 'Uscita');
  const totUscite = uscite.reduce((s, r: any) => s + Number(r.importo || 0), 0);
  const totCosti = (costi ?? []).reduce((s, r: any) => s + Number(r.importo || 0), 0);
  const costiTrigger = (costi ?? []).filter((c: any) => c.trigger_da);

  // Match: per ogni Uscita cerca un costo con stesso created_at o stesso importo+data
  const matches = uscite.map((u: any) => {
    const exact = (costi ?? []).find(
      (c: any) =>
        Number(c.importo) === Number(u.importo) &&
        c.data === u.data &&
        (c.trigger_da === 'parafarmacia_cassa' ||
          c.trigger_da?.toLowerCase?.().includes('parafarm') ||
          (c.descrizione || '').toLowerCase().includes('parafarm'))
    );
    return {
      uscita_id: u.id,
      data: u.data,
      importo: u.importo,
      descrizione_cassa: u.descrizione,
      mirror_costo: exact
        ? { id: exact.id, descrizione: exact.descrizione, trigger_da: exact.trigger_da, categoria: exact.categoria }
        : null,
    };
  });

  const summary = {
    periodo: { inizio, fine },
    uscite_count: uscite.length,
    uscite_totale: totUscite,
    costi_count: (costi ?? []).length,
    costi_totale: totCosti,
    costi_con_trigger: costiTrigger.length,
    costi_trigger_sample: costiTrigger.slice(0, 5),
    matches,
    uscite_orfane: matches.filter((m) => !m.mirror_costo).length,
    costi_categorie: Array.from(new Set((costi ?? []).map((c: any) => c.categoria))),
    costi_sample: (costi ?? []).slice(0, 10),
  };
  fs.writeFileSync(path.join(OUT, '05-uscite-parafarmacia.json'), JSON.stringify(summary, null, 2));

  console.log(
    '\n=== USCITE PARAFARMACIA → COSTI ===\n' +
      `Uscite parafarmacia aprile: ${uscite.length} righe per €${totUscite.toFixed(2)}\n` +
      `Costi aprile (totale tabella): ${(costi ?? []).length} righe per €${totCosti.toFixed(2)}\n` +
      `  di cui auto-generati (trigger_da non nullo): ${costiTrigger.length}\n` +
      `Uscite con costo mirror trovato: ${matches.filter((m) => m.mirror_costo).length}/${uscite.length}\n` +
      `Uscite "orfane" (nessun costo): ${matches.filter((m) => !m.mirror_costo).length}\n`
  );
});
