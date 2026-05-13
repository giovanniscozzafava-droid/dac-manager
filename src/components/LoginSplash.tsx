import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  authError?: string;
}

type Mode = 'login' | 'options' | 'forgot' | 'sent';

export default function LoginSplash({ onLogin, authError }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');

  // Stato per il flow "password dimenticata"
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

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

  async function sendResetEmail() {
    setForgotError(null);
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail) { setForgotError('Inserisci la tua email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setForgotError('Email non valida.');
      return;
    }
    setForgotBusy(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
    setForgotBusy(false);
    if (error) {
      // Per sicurezza, mostriamo sempre messaggio neutro: non riveliamo se l'email esiste o no.
      // Logghiamo l'errore reale in console solo per debug.
      console.warn('[resetPasswordForEmail]', error.message);
    }
    setMode('sent');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🏥</div>
          <h1 className="text-3xl font-bold text-white mb-1">Palazzo della Salute</h1>
          <p className="text-slate-400 text-sm">DAC Manager v1.3</p>
        </div>

        {/* ── FORM LOGIN (default) ────────────────────────────── */}
        {mode === 'login' && (
          <>
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

            <div className="mt-6 text-center space-y-3">
              <button
                onClick={() => { setForgotEmail(email); setMode('forgot'); }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors block w-full"
              >
                Password dimenticata?
              </button>
              <p className="text-xs text-slate-500">© 2026 Fuyue Digital Agency</p>
              <button onClick={() => setMode('options')}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                Problemi di accesso?
              </button>
            </div>
          </>
        )}

        {/* ── OPTIONS (menu problemi accesso) ─────────────────── */}
        {mode === 'options' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300 text-center mb-2">Cosa ti succede?</p>

            <button
              onClick={() => { setForgotEmail(email); setMode('forgot'); }}
              className="w-full text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500 transition-colors"
            >
              <div className="text-sm font-semibold text-white">🔑 Ho dimenticato la password</div>
              <div className="text-xs text-slate-400 mt-1">Ti mandiamo un'email con un link per crearne una nuova</div>
            </button>

            <button
              onClick={resetApp}
              className="w-full text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-amber-500 transition-colors"
            >
              <div className="text-sm font-semibold text-white">🔄 La pagina è bloccata / non entra</div>
              <div className="text-xs text-slate-400 mt-1">Ripulisce i dati locali del browser e ricarica</div>
            </button>

            <button
              onClick={() => setMode('login')}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Torna al login
            </button>
          </div>
        )}

        {/* ── FORGOT PASSWORD (form email) ─────────────────────── */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">🔑</div>
              <h2 className="text-lg font-semibold text-white">Recupera password</h2>
              <p className="text-xs text-slate-400 mt-1">Inserisci la tua email: ti mandiamo il link per creare una nuova password.</p>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">La tua email</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendResetEmail()}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="nome@laboratoridac.it"
                autoComplete="email"
                autoFocus
              />
            </div>

            {forgotError && (
              <div className="text-sm text-red-400 text-center">{forgotError}</div>
            )}

            <button
              onClick={sendResetEmail}
              disabled={forgotBusy || !forgotEmail.trim()}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {forgotBusy ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Invio...</span>
                </>
              ) : (
                'Mandami il link'
              )}
            </button>

            <button
              onClick={() => setMode('login')}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Torna al login
            </button>
          </div>
        )}

        {/* ── SENT (conferma email inviata) ───────────────────── */}
        {mode === 'sent' && (
          <div className="space-y-4 text-center">
            <div className="text-5xl mb-2">📧</div>
            <h2 className="text-xl font-semibold text-white">Controlla la tua email</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Se l'email <strong className="text-white">{forgotEmail.trim().toLowerCase()}</strong> è registrata,
              tra pochi minuti ti arriverà un link per creare una nuova password.
            </p>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 text-left space-y-2">
              <p className="text-xs text-slate-400">
                <strong className="text-slate-200">Cosa fare ora:</strong>
              </p>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Apri la tua casella email (anche nello SPAM)</li>
                <li>Clicca il link <em>"Reset Password"</em> di Palazzo della Salute</li>
                <li>Scegli una nuova password (minimo 8 caratteri)</li>
                <li>Torna qui e accedi con la nuova password</li>
              </ol>
            </div>
            <button
              onClick={() => { setMode('login'); setForgotEmail(''); setForgotError(null); }}
              className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
            >
              Torna al login
            </button>
            <button
              onClick={() => setMode('forgot')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Non mi è arrivata, ritenta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
