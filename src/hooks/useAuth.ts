import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Operatore {
  id: string
  nome: string
  cognome: string | null
  email: string | null
  ruolo: string
  emoji: string
  settore: string | null
  attivo: boolean
  profilo_completo: boolean
  telefono: string | null
}

export function useAuth() {
  const [session, setSession] = useState<any>(null)
  const [operatore, setOperatore] = useState<Operatore | null>(null)
  const [loading, setLoading] = useState(true)

  const loadOperatore = useCallback(async (email: string | undefined) => {
    if (!email) { setLoading(false); return }
    const { data } = await supabase
      .from('operatori')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('attivo', true)
      .maybeSingle()
    setOperatore(data as Operatore | null)
    setLoading(false)
  }, [])

  useEffect(() => {
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
  }, [loadOperatore])

  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
    setOperatore(null)
  }

  function refresh() {
    if (session?.user?.email) {
      setLoading(true)
      loadOperatore(session.user.email)
    }
  }

  return {
    session,
    operatore,
    loading,
    isAuthenticated: !!session,
    hasProfile: !!operatore,
    isReady: !!session && !!operatore && operatore.profilo_completo,
    logout,
    refresh,
  }
}
