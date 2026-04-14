import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface Operatore {
  id: string
  nome: string
  cognome: string | null
  email: string | null
  ruolo: string
  emoji: string
  colore: string
  colore_bordo: string
  area: string | null
  attivo: boolean
}

interface AuthState {
  user: User | null
  session: Session | null
  operatore: Operatore | null
  operatori: Operatore[]
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    operatore: null,
    operatori: [],
    loading: true,
    error: null,
  })

  // Carica sessione iniziale
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }))
      if (session?.user) {
        loadOperatori()
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }))
      if (session?.user) {
        loadOperatori()
      } else {
        setState(s => ({ ...s, operatore: null, operatori: [], loading: false }))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadOperatori = async () => {
    const { data, error } = await supabase
      .from('operatori')
      .select('*')
      .eq('attivo', true)
      .order('nome')

    if (error) {
      setState(s => ({ ...s, error: error.message, loading: false }))
      return
    }

    // Controlla se c'è un operatore salvato in localStorage
    const savedId = localStorage.getItem('dac_operatore_id')
    const savedOp = data?.find(o => o.id === savedId) ?? null

    setState(s => ({
      ...s,
      operatori: data ?? [],
      operatore: savedOp,
      loading: false,
    }))
  }

  const loginGoogle = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setState(s => ({ ...s, error: error.message, loading: false }))
    }
  }, [])

  // Login con email/password (fallback per dev)
  const loginEmail = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setState(s => ({ ...s, error: error.message, loading: false }))
    }
  }, [])

  const selectOperatore = useCallback((op: Operatore) => {
    localStorage.setItem('dac_operatore_id', op.id)
    setState(s => ({ ...s, operatore: op }))
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem('dac_operatore_id')
    setState(s => ({ ...s, operatore: null }))
  }, [])

  const logoutFull = useCallback(async () => {
    localStorage.removeItem('dac_operatore_id')
    await supabase.auth.signOut()
    setState(s => ({ ...s, operatore: null, user: null, session: null, operatori: [] }))
  }, [])

  return {
    ...state,
    loginGoogle,
    loginEmail,
    selectOperatore,
    logout,
    logoutFull,
    isAuthenticated: !!state.session,
    isOperatoreSelected: !!state.operatore,
  }
}
