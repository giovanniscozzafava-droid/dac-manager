import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://yyjhuvftcwvnxlskvjne.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amh1dmZ0Y3d2bnhsc2t2am5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDg1MDUsImV4cCI6MjA5MTcyNDUwNX0.MEohst7ka_cg_XtwLIbCRbxphxQghqYdFBDSkWMftas',
  {
    auth: {
      storageKey: 'dac-auth',
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn();
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'dac-manager-web',
      },
    },
  }
)

// Auto-refresh della sessione ogni 30 minuti
if (typeof window !== 'undefined') {
  setInterval(async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      await supabase.auth.refreshSession()
    }
  }, 30 * 60 * 1000)

  // Re-check quando la tab torna attiva
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        await supabase.auth.refreshSession()
      }
    }
  })
}
