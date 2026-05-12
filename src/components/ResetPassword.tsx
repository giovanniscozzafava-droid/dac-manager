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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
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

        {success ? (
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
