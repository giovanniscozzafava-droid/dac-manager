/**
 * Helper per la gestione uniforme degli errori Supabase nelle operazioni write.
 *
 * Pattern d'uso:
 *
 *   const { error } = await supabase.from('ricavi').insert(payload);
 *   if (!reportError('salvataggio ricavo', error)) return;
 *
 * Mostra all'utente un alert con un messaggio comprensibile + logga in console
 * il dettaglio tecnico per debug.
 */
export function reportError(action: string, error: { message: string } | null | undefined): boolean {
  if (!error) return true;
  // eslint-disable-next-line no-console
  console.error(`[db] errore in "${action}":`, error);
  try {
    alert(`Errore durante "${action}":\n${error.message}\n\nRiprova o contatta l'amministratore.`);
  } catch {
    // ignore
  }
  return false;
}
