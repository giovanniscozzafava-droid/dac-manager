import { useState } from 'react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  authError?: string;
}

export default function LoginSplash({ onLogin, authError }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch {
      setLoading(false);
    }
  }

  async function resetApp() {
    if (!confirm('Questo ripulirà tutti i dati locali e ricaricherà l\'app. Continuare?')) return;
    Object.keys(localStorage).forEach(k => localStorage.removeItem(k));
    Object.keys(sessionStorage).forEach(k => sessionStorage.removeItem(k));
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map(db => db.name ? indexedDB.deleteDatabase(db.name) : null));
    } catch {}
    location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🏥</div>
          <h1 className="text-3xl font-bold text-white mb-1">Palazzo della Salute</h1>
          <p className="text-slate-400 text-sm">DAC Manager v1.3</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="nome@laboratoridac.it"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {authError && (
            <div className="text-sm text-red-400 text-center">{authError}</div>
          )}
          <button
            onClick={submit}
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Accesso...</span>
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 mb-3">© 2026 Fuyue Digital Agency</p>

          {!showReset ? (
            <button onClick={() => setShowReset(true)}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
              Problemi di accesso?
            </button>
          ) : (
            <div className="mt-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-[11px] text-slate-400 mb-2">
                Se il login non va o la pagina è bloccata, ripulisci la sessione:
              </p>
              <button onClick={resetApp}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-slate-700 text-slate-200 hover:bg-slate-600">
                Reset sessione locale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
