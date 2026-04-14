import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function LoginSplash() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      if (error.message === 'Invalid login credentials') setError('Email o password errati')
      else if (error.message.includes('Email not confirmed')) setError('Account non ancora confermato')
      else setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg">
      <div className="w-full max-w-sm mx-4 animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="font-display text-2xl font-bold text-white">DAC Manager</h1>
          <p className="text-dac-gray-400 text-sm mt-1">Palazzo della Salute</p>
        </div>

        <div className="bg-dac-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5 text-center">
            <h2 className="text-sm font-semibold text-white">Accedi al gestionale</h2>
            <p className="text-[10px] text-dac-gray-500 mt-1">Usa le credenziali fornite dall'amministratore</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="la.tua@email.it" required autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
            </div>

            {error && <div className="px-3 py-2 rounded-lg bg-dac-red/10 border border-dac-red/20 text-xs text-dac-red">❌ {error}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔑 Accedi'}
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-dac-gray-500 mt-4">DAC Manager v2.0 — Fuyue Digital Agency</p>
      </div>
    </div>
  )
}
