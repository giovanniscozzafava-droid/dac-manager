import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'dac-auth';
const LOCK_PREFIX = `lock:${STORAGE_KEY}`;
const LOCK_MAX_AGE_MS = 10000;

function cleanupStaleAuthLocks() {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(LOCK_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) { toRemove.push(key); continue; }
        const data = JSON.parse(raw);
        const ts = typeof data?.t === 'number' ? data.t : 0;
        if (!ts || now - ts > LOCK_MAX_AGE_MS) {
          toRemove.push(key);
        }
      } catch {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    if (toRemove.length > 0) {
      console.info('[supabase] Pulizia lock orfani: ' + toRemove.length + ' chiavi rimosse');
    }
  } catch (e) {
    console.warn('[supabase] cleanupStaleAuthLocks fallito:', e);
  }
}

cleanupStaleAuthLocks();

export const supabase = createClient(
  'https://yyjhuvftcwvnxlskvjne.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amh1dmZ0Y3d2bnhsc2t2am5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDg1MDUsImV4cCI6MjA5MTcyNDUwNX0.MEohst7ka_cg_XtwLIbCRbxphxQghqYdFBDSkWMftas',
  {
    auth: {
      storageKey: STORAGE_KEY,
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: { params: { eventsPerSecond: 10 } },
    global: { headers: { 'x-client-info': 'dac-manager-web' } },
  }
)
