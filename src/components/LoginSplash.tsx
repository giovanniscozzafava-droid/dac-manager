import React, { useState } from 'react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  error: string;
}

export default function LoginSplash({ onLogin, onRegister, error }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    if (!email || !password) return;

    if (tab === 'register') {
      if (password.length < 6) { setLocalError('Password minimo 6 caratteri'); return; }
      if (password !== confirm) { setLocalError('Le password non coincidono'); return; }
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
        setSuccess('✅ Account creato! Ora puoi accedere.');
        setTab('login');
        setPassword('');
        setConfirm('');
      }
    } catch {
      // error handled by parent
    }
    setLoading(false);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-2xl font-bold text-white">Palazzo della Salute</h1>
          <p className="text-blue-300/50 text-sm mt-1">DAC Manager v1.3</p>
        </div>

        {/* Tab switch */}
        <div className="flex mb-6 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => { setTab('login'); setLocalError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === 'login' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Accedi
          </button>
          <button
            onClick={() => { setTab('register'); setLocalError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === 'register' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Registrati
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-blue-200/60 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 transition-all"
              placeholder="nome@laboratoridac.it"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200/60 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 transition-all"
              placeholder="••••••••"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-blue-200/60 mb-1.5">Conferma password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {success && (
            <div className="px-3 py-2 bg-green-500/15 border border-green-500/20 rounded-lg text-green-300 text-sm">
              {success}
            </div>
          )}

          {displayError && (
            <div className="px-3 py-2 bg-red-500/15 border border-red-500/20 rounded-lg text-red-300 text-sm">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || (tab === 'register' && !confirm)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {tab === 'login' ? 'Accesso...' : 'Registrazione...'}
              </span>
            ) : (
              tab === 'login' ? 'Accedi' : 'Crea account'
            )}
          </button>
        </form>

        {tab === 'register' && (
          <p className="mt-4 text-center text-blue-300/30 text-xs">
            Usa la stessa email che l'amministratore ha inserito nel sistema
          </p>
        )}

        <p className="mt-10 text-center text-blue-300/20 text-xs">
          © 2026 Fuyue Digital Agency
        </p>
      </div>
    </div>
  );
}
