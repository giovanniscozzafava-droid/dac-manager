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

type MatchOk = { ok: true; operatore: Operatore | null };
type MatchErr = { ok: false; reason: 'network' | 'timeout' | 'http' };
type MatchResult = MatchOk | MatchErr;

async function fetchOperatoreByEmail(email: string, accessToken: string): Promise<MatchResult> {
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
    if (!r.ok) return { ok: false, reason: 'http' };
    const data = await r.json();
    return { ok: true, operatore: Array.isArray(data) && data[0] ? (data[0] as Operatore) : null };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network' };
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

  const matchOperatore = useCallback(async (email: string, accessToken?: string): Promise<MatchResult> => {
    let token = accessToken;
    if (!token) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch { /* noop */ }
    }
    if (!token) return { ok: false, reason: 'network' };
    return fetchOperatoreByEmail(email, token);
  }, []);

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;
    let authGen = 0;

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

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<{ timedOut: false; value: T } | { timedOut: true }> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          p.then(value => ({ timedOut: false as const, value })),
          new Promise<{ timedOut: true }>(resolve => {
            timer = setTimeout(() => resolve({ timedOut: true }), ms);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      console.log('[auth]', event, newSession?.user?.id);

      if (event === 'TOKEN_REFRESHED') {
        if (newSession) setSession(newSession);
        return;
      }

      if (event === 'SIGNED_OUT' || !newSession?.user?.email) {
        authGen += 1;
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

      if (currentUserId === newSession.user.id) {
        setSession(newSession);
        return;
      }

      const gen = ++authGen;
      const expectedUserId = newSession.user.id;
      currentUserId = expectedUserId;

      const raced = await withTimeout(
        matchOperatore(newSession.user.email, newSession.access_token),
        6000
      );

      // Logout / unmount / altro evento più recente: scarta risultato stale
      if (!mounted || gen !== authGen || currentUserId !== expectedUserId) return;

      clearTimeout(watchdog);
      try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
      setSession(newSession);
      setUser(newSession.user);

      if (raced.timedOut) {
        setOperatore(null);
        setAuthError('Timeout di rete durante il login. Riprova.');
        setLoading(false);
        return;
      }

      const result = raced.value;
      if (!result.ok) {
        setOperatore(null);
        setAuthError(
          result.reason === 'timeout'
            ? 'Timeout di rete durante il login. Riprova.'
            : 'Problema di rete o server. Riprova tra poco.'
        );
        setLoading(false);
        return;
      }

      setOperatore(result.operatore);
      if (!result.operatore) setAuthError('Account non associato a nessun operatore.');
      else setAuthError('');
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
