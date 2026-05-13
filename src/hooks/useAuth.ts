import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Bypass del client Supabase per la query operatori: il client ha un
// LockManager interno che blocca le query subito dopo SIGNED_IN (sessione
// ricostruita da localStorage al reload). Usiamo fetch diretto al REST API
// con il token già in mano.
const SUPABASE_URL = 'https://yyjhuvftcwvnxlskvjne.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amh1dmZ0Y3d2bnhsc2t2am5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDg1MDUsImV4cCI6MjA5MTcyNDUwNX0.MEohst7ka_cg_XtwLIbCRbxphxQghqYdFBDSkWMftas';

async function fetchOperatoreByEmail(email: string, accessToken: string): Promise<Operatore | null> {
  const cols = 'id,nome,ruolo,settore,email,attivo,emoji,colore,colore_bordo,area';
  const url = `${SUPABASE_URL}/rest/v1/operatori?select=${cols}&email=eq.${encodeURIComponent(email.toLowerCase().trim())}&attivo=eq.true&limit=1`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data) && data[0] ? (data[0] as Operatore) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

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

  // Wrapper: usa fetch diretto + token dalla session corrente
  const matchOperatore = useCallback(async (email: string, accessToken?: string): Promise<Operatore | null> => {
    let token = accessToken;
    if (!token) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch { /* noop */ }
    }
    if (!token) return null;
    return fetchOperatoreByEmail(email, token);
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

      // Nuovo utente: carica operatore con il token che abbiamo già
      // (bypass client supabase per evitare lock interno dopo SIGNED_IN)
      currentUserId = newSession.user.id;
      const op = await withTimeout(
        matchOperatore(newSession.user.email, newSession.access_token),
        6000,
        null
      );
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
