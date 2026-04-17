import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Operatore {
  id: string;
  nome: string;
  ruolo: string;
  settore?: string | null;
  email: string;
  attivo: boolean;
  emoji?: string | null;
  colore?: string | null;
  colore_bordo?: string | null;
  area?: string | null;
}

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [operatore, setOperatore] = useState<Operatore | null>(null);
  const [authError, setAuthError] = useState('');

  const matchOperatore = useCallback(async (email: string): Promise<Operatore | null> => {
    const { data } = await supabase
      .from('operatori')
      .select('id, nome, ruolo, settore, email, attivo, emoji, colore, colore_bordo, area')
      .eq('email', email.toLowerCase().trim())
      .eq('attivo', true)
      .single();
    return data as Operatore | null;
  }, []);

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        if (mounted) setLoading(false);
        return;
      }
      const op = await matchOperatore(session.user.email);
      if (mounted) {
        currentUserId = session.user.id;
        setSession(session);
        setUser(session.user);
        setOperatore(op);
        if (!op) setAuthError('Account non associato a nessun operatore. Contatta l\'amministratore.');
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      console.log('[auth]', event, newSession?.user?.id);

      // TOKEN_REFRESHED: aggiorna solo la session, lascia user/operatore invariati
      if (event === 'TOKEN_REFRESHED') {
        if (newSession) setSession(newSession);
        return;
      }

      // SIGNED_OUT o nessuna sessione: reset
      if (event === 'SIGNED_OUT' || !newSession?.user?.email) {
        currentUserId = null;
        setSession(null);
        setUser(null);
        setOperatore(null);
        setAuthError('');
        return;
      }

      // SIGNED_IN / INITIAL_SESSION: se stesso utente, aggiorna solo session
      if (currentUserId === newSession.user.id) {
        setSession(newSession);
        return;
      }

      // Nuovo utente: carica operatore
      currentUserId = newSession.user.id;
      const op = await matchOperatore(newSession.user.email);
      setSession(newSession);
      setUser(newSession.user);
      setOperatore(op);
      if (!op) setAuthError('Account non associato a nessun operatore.');
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [matchOperatore]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login')) {
        setAuthError('Email o password errati.');
      } else {
        setAuthError(error.message);
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setOperatore(null);
    setAuthError('');
  }, []);

  return {
    loading,
    session,
    user,
    operatore,
    authError,
    isAdmin: operatore?.ruolo === 'admin',
    login,
    logout,
  };
}
