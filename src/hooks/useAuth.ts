import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Operatore {
  id: string
  nome: string
  email: string | null
  ruolo: string
  emoji: string
  settore: string | null
  attivo: boolean
}

export function useAuth() {
  const [session, setSession] = useState<any>(null)
  const [operatore, setOperatore] = useState<Operatore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Ascolta cambi sessione
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadOperatore(data.session.user.email)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadOperatore(session.user.email)
      else { setOperatore(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadOperatore(email: string | undefined) {
    if (!email) { setLoading(false); return }
    setLoading(true)

    const { data } = await supabase
      .from('operatori')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('attivo', true)
      .maybeSingle()

    if (data) {
      setOperatore(data as Operatore)
    } else {
      // Nessun operatore trovato — l'utente deve completare la registrazione
      setOperatore(null)
    }
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
    setOperatore(null)
  }

  return {
    session,
    operatore,
    loading,
    error,
    isAuthenticated: !!session,
    isReady: !!session && !!operatore,
    logout,
  }
}
