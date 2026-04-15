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
  emoji: string;
  colore: string;
  colore_bordo: string;
  area: string;
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

  const loadOperatori = useCallback(async (): Promise<Operatore[]> => {
    const { data, error } = await supabase
      .from('operatori')
      .select('id, nome, ruolo, settore, email, attivo, emoji, colore, colore_bordo, area')
      .eq('attivo', true)
      .order('nome');
    if (error) {
      console.error('Errore caricamento operatori:', error);
      return [];
    }
    return (data || []) as Operatore[];
  }, []);

  const tryRestoreOperatore = useCallback(
    (operatori: Operatore[]): Operatore | null => {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (!savedId) return null;
      return operatori.find((o) => o.id === savedId) || null;
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setState({ loading: false, session: null, user: null, operatore: null, operatori: [], needsOperatoreSelection: false });
        return;
      }
      const ops = await loadOperatori();
      const restored = tryRestoreOperatore(ops);
      if (mounted) setState({ loading: false, session, user: session.user, operatore: restored, operatori: ops, needsOperatoreSelection: !restored });
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (!session) {
        localStorage.removeItem(STORAGE_KEY);
        setState({ loading: false, session: null, user: null, operatore: null, operatori: [], needsOperatoreSelection: false });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const ops = await loadOperatori();
        const restored = tryRestoreOperatore(ops);
        setState({ loading: false, session, user: session.user, operatore: restored, operatori: ops, needsOperatoreSelection: !restored });
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadOperatori, tryRestoreOperatore]);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw error;
  }, []);

  const selectOperatore = useCallback((op: Operatore) => {
    localStorage.setItem(STORAGE_KEY, op.id);
    setState((prev) => ({ ...prev, operatore: op, needsOperatoreSelection: false }));
  }, []);

  const cambiaOperatore = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({ ...prev, operatore: null, needsOperatoreSelection: true }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({ ...prev, operatore: null, needsOperatoreSelection: true }));
  }, []);

  const logoutFull = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
    setState({ loading: false, session: null, user: null, operatore: null, operatori: [], needsOperatoreSelection: false });
  }, []);

  return { ...state, isAdmin: state.operatore?.ruolo === 'admin', loginWithGoogle, selectOperatore, cambiaOperatore, logout, logoutFull };
}
