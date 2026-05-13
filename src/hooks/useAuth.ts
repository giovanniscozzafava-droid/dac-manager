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

    // Watchdog: se entro 8s non siamo usciti da loading, c'è un blocco
    // (lock orfano Supabase, sessione corrotta, cache JS obsoleto).
    // Auto-recovery: pulisce la sessione locale e ricarica la pagina.
    // sessionStorage `dac-auth-recovery` evita loop infiniti di reload.
    const RECOVERY_KEY = 'dac-auth-recovery';
    const watchdog = setTimeout(() => {
      if (!mounted) return;
      const alreadyRecovered = (() => { try { return sessionStorage.getItem(RECOVERY_KEY) === '1'; } catch { return false; } })();
      if (alreadyRecovered) {
        console.warn('[auth] watchdog: già in recovery, mostro form login');
        setLoading(false);
        return;
      }
      console.warn('[auth] watchdog: ripulisco sessione e ricarico');
      try { sessionStorage.setItem(RECOVERY_KEY, '1'); } catch {}
      try { localStorage.removeItem('dac-auth'); } catch {}
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('lock:') || k.includes('dac-auth'))) localStorage.removeItem(k);
        }
      } catch {}
      window.location.reload();
    }, 8000);

    const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    // NIENTE init manuale di getSession() qui.
    // Bug noto: quando il client Supabase fa boot con session esistente in
    // localStorage, il LockManager interno blocca le query successive finché
    // non viene dispatched INITIAL_SESSION. Se chiamiamo matchOperatore qui,
    // va in timeout 6s. Soluzione: lasciamo che onAuthStateChange (sotto)
    // gestisca TUTTO. Il listener viene chiamato subito al subscribe con
    // INITIAL_SESSION (sia null che valida), quindi non perdiamo nulla.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      console.log('[auth]', event, newSession?.user?.id);

      // TOKEN_REFRESHED: aggiorna solo la session, lascia user/operatore invariati
      if (event === 'TOKEN_REFRESHED') {
        if (newSession) setSession(newSession);
        return;
      }

      // SIGNED_OUT o nessuna sessione: reset + mostra form login
      if (event === 'SIGNED_OUT' || !newSession?.user?.email) {
        currentUserId = null;
        setSession(null);
        setUser(null);
        setOperatore(null);
        setAuthError('');
        clearTimeout(watchdog);
        try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
        setLoading(false);
        return;
      }

      // SIGNED_IN / INITIAL_SESSION: se stesso utente, aggiorna solo session
      if (currentUserId === newSession.user.id) {
        setSession(newSession);
        return;
      }

      // Nuovo utente: carica operatore (con timeout di sicurezza)
      currentUserId = newSession.user.id;
      const op = await withTimeout(matchOperatore(newSession.user.email), 6000, null);
      clearTimeout(watchdog);
      try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
      setSession(newSession);
      setUser(newSession.user);
      setOperatore(op);
      if (!op) setAuthError('Account non associato a nessun operatore.');
      setLoading(false);
    });

    return () => { mounted = false; clearTimeout(watchdog); subscription.unsubscribe(); };
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
