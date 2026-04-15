import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [operatore, setOperatore] = useState<Operatore | null>(null);
  const [authError, setAuthError] = useState('');

  const matchOperatore = async (email: string): Promise<Operatore | null> => {
    try {
      const { data } = await supabase
        .from('operatori')
        .select('id, nome, ruolo, settore, email, attivo, emoji, colore, colore_bordo, area')
        .eq('email', email.toLowerCase().trim())
        .eq('attivo', true)
        .single();
      return data as Operatore | null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const op = await matchOperatore(session.user.email);
          if (mounted) {
            setOperatore(op);
            if (!op) setAuthError('Email non associata a nessun operatore.');
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
      }
      if (mounted) setLoading(false);
    };

    // Timeout di sicurezza: se dopo 5 sec non ha finito, forza loading = false
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    init().then(() => clearTimeout(timeout));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session?.user?.email) {
        setOperatore(null);
        setAuthError('');
        setLoading(false);
        return;
      }
      const op = await matchOperatore(session.user.email);
      if (mounted) {
        setOperatore(op);
        if (!op) setAuthError('Email non associata a nessun operatore.');
        setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
    if (error) {
      setAuthError(error.message.includes('Invalid login') ? 'Email o password errati.' : error.message);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setAuthError('');
    const clean = email.toLowerCase().trim();
    const { data: op } = await supabase.from('operatori').select('id').eq('email', clean).eq('attivo', true).single();
    if (!op) { const msg = 'Email non autorizzata. Contatta l\'amministratore.'; setAuthError(msg); throw new Error(msg); }
    const { error } = await supabase.auth.signUp({ email: clean, password });
    if (error) { setAuthError(error.message); throw error; }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setOperatore(null);
    setAuthError('');
  }, []);

  return { loading, operatore, authError, isAdmin: operatore?.ruolo === 'admin', login, register, logout };
}
