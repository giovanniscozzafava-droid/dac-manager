import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function useAutoRefresh(reloadFn: () => void | Promise<void>) {
  const location = useLocation()

  useEffect(() => {
    reloadFn()
  }, [location.pathname])

  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'visible') {
        // Forza refresh sessione PRIMA di ricaricare
        try { await supabase.auth.refreshSession() } catch {}
        reloadFn()
      }
    }
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('focus', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }, [reloadFn])
}
