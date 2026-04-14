import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  error: string
  loading: boolean
}

const SETTORI = [
  { value: 'Lab Analisi', emoji: '🔬', desc: '1° Piano — Analisi cliniche' },
  { value: 'Estetica Laser/Viso', emoji: '👩‍🔬', desc: '2° Piano — Laser, radiofrequenza, viso' },
  { value: 'Estetica Corpo/Mani', emoji: '💅', desc: '2° Piano — Corpo, mani, piedi' },
  { value: 'Ambulatorio Specialisti', emoji: '🩺', desc: '2° Piano — Visite specialistiche' },
  { value: 'Parafarmacia', emoji: '💊', desc: 'Piano terra — Vendita e consulenza' },
  { value: 'Segreteria', emoji: '📞', desc: 'Accettazione, prenotazioni, recall' },
  { value: 'Direzione', emoji: '👔', desc: 'Amministrazione e gestione' },
]

export function LoginSplash({ error: externalError, loading: externalLoading }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [settore, setSettore] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email o password errati' : error.message)
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Inserisci il tuo nome'); return }
    if (!settore) { setError('Seleziona il tuo settore'); return }
    if (password.length < 6) { setError('La password deve essere almeno 6 caratteri'); return }

    setError(''); setLoading(true)

    // 1. Registra su Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(authError.message === 'User already registered' ? 'Email già registrata — usa Login' : authError.message)
      setLoading(false); return
    }

    // 2. Crea profilo operatore
    const selectedSettore = SETTORI.find(s => s.value === settore)
    const ruolo = settore === 'Direzione' ? 'admin' : 'operatore'

    const { error: opError } = await supabase.from('operatori').insert({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      ruolo,
      emoji: selectedSettore?.emoji ?? '👤',
      settore,
      attivo: true,
    })

    if (opError && !opError.message.includes('duplicate')) {
      setError('Errore creazione profilo: ' + opError.message)
      setLoading(false); return
    }

    setLoading(false)
    setSuccess('✅ Registrazione completata! Ora puoi fare login.')
    setMode('login')
    setPassword('')
  }

  const combinedError = error || externalError

  return (
    <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg overflow-auto">
      <div className="w-full max-w-sm mx-4 my-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="font-display text-2xl font-bold text-white">DAC Manager</h1>
          <p className="text-dac-gray-400 text-sm mt-1">Palazzo della Salute</p>
        </div>

        {/* Card */}
        <div className="bg-dac-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-dac-accent border-b-2 border-dac-accent' : 'text-dac-gray-400'}`}>
              Login
            </button>
            <button onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'register' ? 'text-dac-accent border-b-2 border-dac-accent' : 'text-dac-gray-400'}`}>
              Registrati
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="p-5 space-y-4">
            {/* Successo */}
            {success && <div className="px-3 py-2 rounded-lg bg-dac-green/10 border border-dac-green/20 text-xs text-dac-green">{success}</div>}

            {/* === REGISTRAZIONE: nome + settore === */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">Il tuo nome</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Es. Teresa, Valentina, Dott. Rossi..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">In che settore operi?</label>
                  <div className="space-y-1.5">
                    {SETTORI.map(s => (
                      <button key={s.value} type="button" onClick={() => setSettore(s.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border
                          ${settore === s.value
                            ? 'bg-dac-accent/10 border-dac-accent/30 text-white'
                            : 'bg-white/[0.02] border-white/5 text-dac-gray-400 hover:bg-white/[0.04] hover:border-white/10'}`}>
                        <span className="text-xl">{s.emoji}</span>
                        <div>
                          <div className="text-xs font-semibold">{s.value}</div>
                          <div className="text-[10px] text-dac-gray-500">{s.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="la.tua@email.it" required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
                Password {mode === 'register' && <span className="text-dac-gray-500">(min. 6 caratteri)</span>}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
            </div>

            {/* Errore */}
            {combinedError && <div className="px-3 py-2 rounded-lg bg-dac-red/10 border border-dac-red/20 text-xs text-dac-red">❌ {combinedError}</div>}

            {/* Submit */}
            <button type="submit" disabled={loading || externalLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90
                disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {loading || externalLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : mode === 'login' ? '🔑 Accedi' : '✅ Registrati'}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-dac-gray-500 mt-4">DAC Manager v2.0 — Fuyue Digital Agency</p>
      </div>
    </div>
  )
}
