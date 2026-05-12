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

function codiceFromCreatedAt(createdAt: string, prefix: string): string {
  // Replica del pattern: PF-yyMMddHHmmss da created_at (UTC, come visto nei dati)
  const d = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

test('scout copertura mirror parafarmacia (tutto lo storico)', async () => {
  const sb = createClient(SB_URL, SB_ANON);
  await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

  const [{ data: cassa }, { data: ricavi }, { data: costi }] = await Promise.all([
    sb.from('parafarmacia_cassa').select('*'),
    sb.from('ricavi').select('*'),
    sb.from('costi').select('*'),
  ]);

  const cassaRows = cassa ?? [];
  const ricaviRows = ricavi ?? [];
  const costiRows = costi ?? [];

  const ricaviByCodice = new Map(ricaviRows.map((r: any) => [r.codice, r]));
  const costiByCodice = new Map(costiRows.map((c: any) => [c.codice, c]));

  const entrate = cassaRows.filter((r: any) => r.tipo === 'Entrata');
  const uscite = cassaRows.filter((r: any) => r.tipo === 'Uscita');

  const entrateCoverage = entrate.map((r: any) => {
    const expectedCodice = codiceFromCreatedAt(r.created_at, 'PF');
    const mirror = ricaviByCodice.get(expectedCodice);
    return {
      id: r.id,
      data: r.data,
      importo: r.importo,
      created_at: r.created_at,
      expected_codice: expectedCodice,
      mirror_found: !!mirror,
      mirror_id: mirror ? (mirror as any).id : null,
      mirror_importo: mirror ? (mirror as any).importo : null,
      mirror_iva: mirror ? (mirror as any).iva : null,
    };
  });

  const usciteCoverage = uscite.map((r: any) => {
    const expectedCodice = codiceFromCreatedAt(r.created_at, 'PF');
    const mirror = costiByCodice.get(expectedCodice);
    return {
      id: r.id,
      data: r.data,
      importo: r.importo,
      created_at: r.created_at,
      expected_codice: expectedCodice,
      mirror_found: !!mirror,
      mirror_id: mirror ? (mirror as any).id : null,
      mirror_importo: mirror ? (mirror as any).importo : null,
      mirror_iva: mirror ? (mirror as any).iva : null,
    };
  });

  const summary = {
    entrate: {
      total: entrate.length,
      mirror_ok: entrateCoverage.filter((e) => e.mirror_found).length,
      mirror_missing: entrateCoverage.filter((e) => !e.mirror_found).length,
      missing_list: entrateCoverage.filter((e) => !e.mirror_found),
      iva_persa: entrateCoverage.filter((e) => e.mirror_found && Number(e.mirror_iva || 0) === 0).length,
    },
    uscite: {
      total: uscite.length,
      mirror_ok: usciteCoverage.filter((e) => e.mirror_found).length,
      mirror_missing: usciteCoverage.filter((e) => !e.mirror_found).length,
      missing_list: usciteCoverage.filter((e) => !e.mirror_found),
    },
  };

  fs.writeFileSync(path.join(OUT, '06-mirror-coverage.json'), JSON.stringify(summary, null, 2));

  console.log(
    '\n=== MIRROR COVERAGE (tutto lo storico) ===\n' +
      `ENTRATE parafarmacia: ${entrate.length} totali\n` +
      `  ✓ mirror in ricavi: ${summary.entrate.mirror_ok}\n` +
      `  ✗ mirror MANCANTE: ${summary.entrate.mirror_missing}\n` +
      `  ⚠ IVA azzerata nel mirror: ${summary.entrate.iva_persa}\n` +
      `\n` +
      `USCITE parafarmacia: ${uscite.length} totali\n` +
      `  ✓ mirror in costi:  ${summary.uscite.mirror_ok}\n` +
      `  ✗ mirror MANCANTE: ${summary.uscite.mirror_missing}\n`
  );
});
