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
const NOTE_PREFIX = '__TEST_BUG1_';

test('scout bug #1 — completare appuntamento crea ricavi duplicati?', async () => {
  test.setTimeout(60_000);
  const sb = createClient(SB_URL, SB_ANON);
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) throw authErr;
  const userId = auth.user?.id;

  const log: any = { userId, steps: [] };

  // 1) INSERT appuntamento "Prenotato"
  const note = NOTE_PREFIX + Date.now();
  const insertPayload = {
    paziente_nome: '__TEST Paziente',
    servizio_nome: '__TEST Visita',
    operatore_nome: 'Giovanni Scozzafava',
    data: new Date().toISOString().slice(0, 10),
    ora: '10:00',
    durata_minuti: 30,
    stato: 'Prenotato',
    importo: 99,
    metodo_pagamento: 'Contanti',
    note,
  };
  const { data: created, error: insErr } = await sb
    .from('appuntamenti')
    .insert(insertPayload)
    .select()
    .single();

  log.steps.push({ step: 'insert', payload: insertPayload, error: insErr, created });
  if (insErr) {
    fs.writeFileSync(path.join(OUT, '08-bug1.json'), JSON.stringify(log, null, 2));
    throw new Error(`insert appuntamento: ${insErr.message}`);
  }

  const appId = created!.id;

  try {
    // 2) UPDATE → "Completato"
    const { data: updated, error: updErr } = await sb
      .from('appuntamenti')
      .update({ stato: 'Completato', completato_at: new Date().toISOString() })
      .eq('id', appId)
      .select()
      .single();
    log.steps.push({ step: 'update→Completato', updated, error: updErr });
    if (updErr) throw new Error(`update: ${updErr.message}`);

    // attendi che il trigger giri (dovrebbe essere sincrono ma diamo aria)
    await new Promise((r) => setTimeout(r, 1500));

    // 3) Conta ricavi linkati
    const { data: ricavi1, error: r1Err } = await sb
      .from('ricavi')
      .select('*')
      .eq('appuntamento_id', appId);
    log.steps.push({ step: 'count after first complete', count: ricavi1?.length, ricavi: ricavi1, error: r1Err });

    // 4) Re-complete (idempotenza): UPDATE di nuovo allo stesso stato
    const { error: updErr2 } = await sb
      .from('appuntamenti')
      .update({ stato: 'Completato', completato_at: new Date().toISOString() })
      .eq('id', appId);
    log.steps.push({ step: 'update→Completato (2a volta)', error: updErr2 });

    await new Promise((r) => setTimeout(r, 1500));

    const { data: ricavi2 } = await sb.from('ricavi').select('*').eq('appuntamento_id', appId);
    log.steps.push({ step: 'count after re-complete', count: ricavi2?.length, ricavi: ricavi2 });

    log.result = {
      ricavi_dopo_primo_complete: ricavi1?.length ?? 0,
      ricavi_dopo_secondo_complete: ricavi2?.length ?? 0,
      bug_confermato: (ricavi1?.length ?? 0) > 1 || (ricavi2?.length ?? 0) > (ricavi1?.length ?? 0),
    };

    fs.writeFileSync(path.join(OUT, '08-bug1.json'), JSON.stringify(log, null, 2));
    console.log(
      '\n=== BUG #1 RESULT ===\n' +
        `Appuntamento creato:           id=${appId}\n` +
        `Ricavi dopo 1° complete:       ${log.result.ricavi_dopo_primo_complete}\n` +
        `Ricavi dopo 2° complete:       ${log.result.ricavi_dopo_secondo_complete}\n` +
        `Bug confermato:                ${log.result.bug_confermato}\n` +
        `(1° == 1 e 2° == 1 → OK | 1° == 2 → trigger crea doppi | 2° > 1° → trigger non-idempotente)\n`
    );

    expect(ricavi1?.length, '1° complete deve creare 1 sola riga ricavi').toBe(1);
    expect(ricavi2?.length, '2° complete (idempotenza) deve mantenere 1 sola riga').toBe(1);
  } finally {
    // CLEANUP: sempre
    await sb.from('ricavi').delete().eq('appuntamento_id', appId);
    await sb.from('appuntamenti').delete().eq('id', appId);
    log.cleanup = 'done';
    fs.writeFileSync(path.join(OUT, '08-bug1.json'), JSON.stringify(log, null, 2));
  }
});
