import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Operatore {
  id: string;
  nome: string;
  ruolo: string;
  settore: string;
  email: string;
  attivo: boolean;
  avatar_emoji?: string;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  operatore: Operatore | null;
  operatori: Operatore[];
  needsOperatoreSelection: boolean;
}

const STORAGE_KEY = 'dac_operatore_id';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    operatore: null,
    operatori: [],
    needsOperatoreSelection: false,
  });

  // ─── Carica operatori attivi da DB ───
  const loadOperatori = useCallback(async (): Promise<Operatore[]> => {
    const { data, error } = await supabase
      .from('operatori')
      .select('id, nome, ruolo, settore, email, attivo')
      .eq('attivo', true)
      .order('nome');

    if (error) {
      console.error('Errore caricamento operatori:', error);
      return [];
    }
    return (data || []) as Operatore[];
  }, []);

  // ─── Prova a ripristinare operatore da localStorage ───
  const tryRestoreOperatore = useCallback(
    (operatori: Operatore[]): Operatore | null => {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (!savedId) return null;
      return operatori.find((o) => o.id === savedId) || null;
    },
    []
  );

  // ─── Init: ascolta auth state changes ───
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Recupera sessione attuale
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) {
          setState({
            loading: false,
            session: null,
            user: null,
            operatore: null,
            operatori: [],
            needsOperatoreSelection: false,
          });
        }
        return;
      }

      // Sessione attiva → carica operatori
      const ops = await loadOperatori();
      const restored = tryRestoreOperatore(ops);

      if (mounted) {
        setState({
          loading: false,
          session,
          user: session.user,
          operatore: restored,
          operatori: ops,
          needsOperatoreSelection: !restored,
        });
      }
    };

    init();

    // Listener per cambio auth (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (!session) {
        localStorage.removeItem(STORAGE_KEY);
        setState({
          loading: false,
          session: null,
          user: null,
          operatore: null,
          operatori: [],
          needsOperatoreSelection: false,
        });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const ops = await loadOperatori();
        const restored = tryRestoreOperatore(ops);
        setState({
          loading: false,
          session,
          user: session.user,
          operatore: restored,
          operatori: ops,
          needsOperatoreSelection: !restored,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadOperatori, tryRestoreOperatore]);

  // ─── Login con Google ───
  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('Errore login Google:', error);
      throw error;
    }
  }, []);

  // ─── Seleziona operatore (dopo login Google) ───
  const selectOperatore = useCallback(
    (operatore: Operatore) => {
      localStorage.setItem(STORAGE_KEY, operatore.id);
      setState((prev) => ({
        ...prev,
        operatore,
        needsOperatoreSelection: false,
      }));
    },
    []
  );

  // ─── Cambia operatore (torna alla selezione) ───
  const cambiaOperatore = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      ...prev,
      operatore: null,
      needsOperatoreSelection: true,
    }));
  }, []);

  // ─── Logout (solo operatore, resta loggato Google) ───
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      ...prev,
      operatore: null,
      needsOperatoreSelection: true,
    }));
  }, []);

  // ─── Logout completo (Google + operatore) ───
  const logoutFull = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
    setState({
      loading: false,
      session: null,
      user: null,
      operatore: null,
      operatori: [],
      needsOperatoreSelection: false,
    });
  }, []);

  return {
    ...state,
    isAdmin: state.operatore?.ruolo === 'admin',
    loginWithGoogle,
    selectOperatore,
    cambiaOperatore,
    logout,
    logoutFull,
  };
}
