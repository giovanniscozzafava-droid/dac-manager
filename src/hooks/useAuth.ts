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

    const init = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          6000,
          { data: { session: null } } as any
        );
        if (!session?.user?.email) {
          if (mounted) {
            clearTimeout(watchdog);
            try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
            setLoading(false);
          }
          return;
        }
        const op = await withTimeout(matchOperatore(session.user.email), 6000, null);
        if (mounted) {
          currentUserId = session.user.id;
          try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
          setSession(session);
          setUser(session.user);
          setOperatore(op);
          if (!op) setAuthError('Account non associato a nessun operatore. Contatta l\'amministratore.');
          clearTimeout(watchdog);
          setLoading(false);
        }
      } catch (err) {
        console.error('[auth] init error:', err);
        if (mounted) { clearTimeout(watchdog); setLoading(false); }
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

      // Nuovo utente: carica operatore (con timeout: stesso problema lock Supabase del bug C)
      currentUserId = newSession.user.id;
      const op = await withTimeout(matchOperatore(newSession.user.email), 6000, null);
      // Forziamo loading=false anche qui per sicurezza (se l'init era in timeout)
      clearTimeout(watchdog);
      setLoading(false);
      setSession(newSession);
      setUser(newSession.user);
      setOperatore(op);
      if (!op) setAuthError('Account non associato a nessun operatore.');
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
