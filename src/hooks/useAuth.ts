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
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    operatore: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }))
      if (session?.user) {
        matchOperatore(session.user)
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }))
      if (session?.user) {
        matchOperatore(session.user)
      } else {
        setState(s => ({ ...s, operatore: null, loading: false }))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Cerca operatore per email. Se non esiste, ne crea uno nuovo.
  async function matchOperatore(user: User) {
    const email = user.email
    if (!email) {
      setState(s => ({ ...s, loading: false, error: 'Nessuna email associata all\'account' }))
      return
    }

    // Cerca operatore esistente con questa email
    const { data: existing } = await supabase
      .from('operatori')
      .select('*')
      .eq('email', email)
      .eq('attivo', true)
      .maybeSingle()

    if (existing) {
      // Collega auth_user_id se non ancora collegato
      if (!existing.auth_user_id) {
        await supabase
          .from('operatori')
          .update({ auth_user_id: user.id })
          .eq('id', existing.id)
      }
      setState(s => ({ ...s, operatore: existing, loading: false }))
      return
    }

    // Non trovato → crea nuovo operatore dall'email
    const nomeCompleto = user.user_metadata?.full_name || email.split('@')[0]
    const parti = nomeCompleto.split(' ')
    const nome = parti[0] || nomeCompleto
    const cognome = parti.slice(1).join(' ') || null

    const { data: nuovo, error } = await supabase
      .from('operatori')
      .insert({
        auth_user_id: user.id,
        nome: nome,
        cognome: cognome,
        email: email,
        ruolo: 'operatore',
        emoji: '👤',
        colore: '#EBF5FB',
        colore_bordo: '#3498DB',
        attivo: true,
      })
      .select()
      .single()

    if (error) {
      setState(s => ({ ...s, loading: false, error: 'Errore creazione profilo: ' + error.message }))
      return
    }

    setState(s => ({ ...s, operatore: nuovo, loading: false }))
  }

  const loginEmail = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setState(s => ({ ...s, error: error.message, loading: false }))
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setState({ user: null, session: null, operatore: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    loginEmail,
    logout,
    isAuthenticated: !!state.session,
    isReady: !!state.operatore,
  }
}
