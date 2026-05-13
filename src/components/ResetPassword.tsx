import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onDone: () => void;
}

export function ResetPassword({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Cleanup sessione vecchia + applica il token recovery dall'URL hash.
  // Risolve il caso in cui l'utente clicca il link recovery mentre era già
  // loggato come altro utente (la vecchia sessione confondeva supabase e
  // l'app si bloccava su splash infinito).
  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      // Watchdog: 6s max. Se Supabase si pianta, mostriamo comunque il form.
      const timeout = setTimeout(() => {
        if (mounted) setBootstrapping(false);
      }, 6000);

      try {
        // 1. Estrai i token dall'hash (#access_token=...&refresh_token=...&type=recovery)
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const isRecovery = params.get('type') === 'recovery';

        if (isRecovery && accessToken && refreshToken) {
          // 2. Pulisci eventuale sessione vecchia (di un altro utente loggato)
          try { await supabase.auth.signOut(); } catch { /* noop */ }
          // 3. Applica la sessione recovery
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }

        // 4. Leggi l'email dell'utente recovery (solo display)
        const { data } = await supabase.auth.getUser();
        if (mounted) setEmail(data.user?.email ?? null);
      } catch (e: any) {
        console.warn('[ResetPassword] bootstrap error:', e?.message || e);
      } finally {
        clearTimeout(timeout);
        if (mounted) setBootstrapping(false);
      }
    };
    bootstrap();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit() {
    setError(null);
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    if (password !== conferma) {
      setError('Le password non coincidono.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    if (window.location.hash.includes('type=recovery')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setTimeout(() => {
      supabase.auth.signOut().finally(onDone);
    }, 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md bg-slate-800/80 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-semibold text-white">Imposta nuova password</h1>
          {email && (
            <p className="text-blue-300/70 text-sm mt-2">{email}</p>
          )}
        </div>

        {bootstrapping ? (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-blue-300/70 text-sm">Verifica del link in corso…</p>
          </div>
        ) : success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-emerald-300 mb-1">Password aggiornata!</p>
            <p className="text-slate-400 text-sm">Ti reindirizziamo al login…</p>
          </div>
        ) : (
          <>
            <label className="block text-sm text-slate-300 mb-1">Nuova password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 8 caratteri"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-blue-500"
              autoFocus
            />

            <label className="block text-sm text-slate-300 mb-1">Conferma password</label>
            <input
              type="password"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              placeholder="Ripeti la password"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700/50 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={busy || !password || !conferma}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition"
            >
              {busy ? 'Aggiornamento…' : 'Aggiorna password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
