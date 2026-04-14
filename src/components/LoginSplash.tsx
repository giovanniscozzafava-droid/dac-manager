import { useState } from 'react'
import { LogIn, UserPlus, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  onLoginEmail: (email: string, password: string) => void
  error: string | null
  loading?: boolean
}

export function LoginSplash({ onLoginEmail, error, loading }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)
  const [regSuccess, setRegSuccess] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    onLoginEmail(email, password)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError(null)

    if (!email || !password) { setRegError('Compila tutti i campi'); return }
    if (password.length < 6) { setRegError('La password deve avere almeno 6 caratteri'); return }
    if (password !== confirmPwd) { setRegError('Le password non coincidono'); return }

    setRegLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    })
    setRegLoading(false)

    if (error) {
      if (error.message.includes('already registered')) {
        setRegError('Questa email è già registrata. Prova ad accedere.')
      } else {
        setRegError(error.message)
      }
      return
    }

    setRegSuccess(true)
  }

  function switchMode(m: 'login' | 'register') {
    setMode(m)
    setRegError(null)
    setRegSuccess(false)
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center noise-bg relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1a2e 40%, #162038 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #2e86c1 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #1abc9c 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative z-10 text-center animate-fade-in w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #1a5276, #2e86c1)' }}>
            <span className="text-4xl">🏥</span>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-tight">
          DAC Manager
        </h1>
        <p className="text-dac-gray-400 text-sm mb-1">Palazzo della Salute</p>
        <p className="text-dac-gray-500 text-xs mb-6">
          LABORATORI DAC S.R.L. — Catenanuova (EN)
        </p>

        {/* Tab Login / Registrati */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200
              ${mode === 'login' ? 'bg-dac-accent text-white shadow-lg' : 'text-dac-gray-400 hover:text-white'}`}
          >
            Accedi
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200
              ${mode === 'register' ? 'bg-dac-accent text-white shadow-lg' : 'text-dac-gray-400 hover:text-white'}`}
          >
            Registrati
          </button>
        </div>

        {/* Registrazione completata */}
        {regSuccess ? (
          <div className="animate-fade-in text-center py-6">
            <CheckCircle size={48} className="mx-auto mb-4 text-dac-green" />
            <h3 className="text-white font-bold text-lg mb-2">Account creato!</h3>
            <p className="text-dac-gray-400 text-sm mb-6">
              Controlla la tua email per confermare l'account, poi torna qui per accedere.
            </p>
            <button
              onClick={() => { switchMode('login'); setRegSuccess(false) }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 transition-opacity"
            >
              Vai al Login
            </button>
          </div>
        ) : mode === 'login' ? (
          /* LOGIN */
          <form onSubmit={handleLogin} className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@laboratorioanalisidac.it"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                  placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50 focus:bg-white/8
                  transition-all duration-200"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                    placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50 focus:bg-white/8
                    transition-all duration-200 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dac-gray-500 hover:text-dac-gray-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-dac-red/10 border border-dac-red/20 text-dac-red text-xs">
                {error === 'Invalid login credentials'
                  ? '❌ Email o password errati'
                  : error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-dac-accent to-dac-blue text-white
                hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                shadow-lg shadow-dac-accent/20 hover:shadow-xl hover:shadow-dac-accent/30
                transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Accedi
                </>
              )}
            </button>
          </form>
        ) : (
          /* REGISTRAZIONE */
          <form onSubmit={handleRegister} className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@laboratorioanalisidac.it"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                  placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50 focus:bg-white/8
                  transition-all duration-200"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                    placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50 focus:bg-white/8
                    transition-all duration-200 pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dac-gray-500 hover:text-dac-gray-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
                Conferma Password
              </label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Ripeti la password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                  placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50 focus:bg-white/8
                  transition-all duration-200"
                autoComplete="new-password"
              />
            </div>

            {regError && (
              <div className="px-4 py-2.5 rounded-xl bg-dac-red/10 border border-dac-red/20 text-dac-red text-xs">
                ❌ {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={regLoading || !email || !password || !confirmPwd}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-dac-teal to-dac-green text-white
                hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                shadow-lg shadow-dac-green/20 hover:shadow-xl hover:shadow-dac-green/30
                transition-all duration-200 active:scale-[0.98]"
            >
              {regLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Crea Account
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-8 text-dac-gray-500 text-[10px]">
          © 2026 Giovanni Scozzafava — Fuyue Digital Agency
        </p>
      </div>
    </div>
  )
}
