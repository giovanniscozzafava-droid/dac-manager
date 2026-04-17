import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Ricarica i dati SOLO al cambio di pathname.
 * Non fa polling, non fa refreshSession, non ascolta visibilitychange.
 * Il token Supabase si auto-refresha già (autoRefreshToken: true in supabase.ts).
 */
export function useAutoRefresh(reloadFn: () => void | Promise<void>) {
  const location = useLocation()
  const fnRef = useRef(reloadFn)
  fnRef.current = reloadFn

  useEffect(() => {
    fnRef.current()
  }, [location.pathname])
}
