import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SB_URL = 'https://yyjhuvftcwvnxlskvjne.supabase.co';
// Anon publishable key — pubblica per design, già hardcoded in src/lib/supabase.ts
export const SB_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amh1dmZ0Y3d2bnhsc2t2am5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDg1MDUsImV4cCI6MjA5MTcyNDUwNX0.MEohst7ka_cg_XtwLIbCRbxphxQghqYdFBDSkWMftas';

export const TEST_PREFIX = '__TEST_';

/** Client Supabase autenticato come utente di test. */
export async function getAuthedSupabase(): Promise<SupabaseClient> {
  const email = process.env.DAC_TEST_EMAIL!;
  const password = process.env.DAC_TEST_PASSWORD!;
  if (!email || !password) throw new Error('DAC_TEST_EMAIL / DAC_TEST_PASSWORD non settate in .env');
  const sb = createClient(SB_URL, SB_ANON);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Supabase login fallito: ${error.message}`);
  return sb;
}

/** Tag univoco per dati creati in un singolo test (timestamp + random). */
export function makeTestTag(prefix = 'GENERIC'): string {
  return `${TEST_PREFIX}${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Cancella i record di test creati con un tag specifico.
 * Cerca il tag nel campo `note` (se esiste) o `descrizione`.
 * Cancella in ordine ricavi → costi → appuntamenti → task → pazienti → parafarmacia_cassa
 * per rispettare eventuali FK.
 */
export async function cleanupByTag(sb: SupabaseClient, tag: string): Promise<void> {
  const tables: { name: string; field: 'note' | 'descrizione' | 'nome' | 'cognome' }[] = [
    { name: 'ricavi', field: 'note' },
    { name: 'costi', field: 'note' },
    { name: 'task', field: 'note' },
    { name: 'appuntamenti', field: 'note' },
    { name: 'parafarmacia_cassa', field: 'note' },
    { name: 'inventario_parafarmacia', field: 'prodotto' },
    { name: 'pazienti', field: 'cognome' },
  ];
  for (const t of tables) {
    await sb.from(t.name).delete().like(t.field, `%${tag}%`);
  }
}

/** Cleanup “a tappeto” di TUTTI i record che iniziano col TEST_PREFIX. Da usare con cautela in afterAll globali. */
export async function cleanupAllTestPrefix(sb: SupabaseClient): Promise<void> {
  const tables: { name: string; field: string }[] = [
    { name: 'ricavi', field: 'note' },
    { name: 'costi', field: 'note' },
    { name: 'task', field: 'note' },
    { name: 'appuntamenti', field: 'note' },
    { name: 'parafarmacia_cassa', field: 'note' },
    { name: 'inventario_parafarmacia', field: 'prodotto' },
    { name: 'pazienti', field: 'cognome' },
  ];
  for (const t of tables) {
    await sb.from(t.name).delete().like(t.field, `${TEST_PREFIX}%`);
  }
}
