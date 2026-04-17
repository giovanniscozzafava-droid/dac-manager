import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function useAutoRefresh(reloadFn: () => void | Promise<void>) {
  const location = useLocation()

  // Reload al cambio pagina
  useEffect(() => {
    reloadFn()
  }, [location.pathname])

  // Reload quando tab torna attiva
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'visible') {
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

  // Polling ogni 10 secondi se tab visibile
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reloadFn()
    }, 10 * 1000)
    return () => clearInterval(id)
  }, [reloadFn])
}
