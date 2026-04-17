import { useEffect } from 'react'

/**
 * Hook che richiama la funzione di reload quando:
 * - La tab torna visibile (cambio app / sleep)
 * - La connessione torna online
 * - Ogni 2 minuti se la tab è attiva
 */
export function useAutoRefresh(reloadFn: () => void | Promise<void>) {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reloadFn()
      }
    }

    const handleOnline = () => {
      reloadFn()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleVisibility)

    // Refresh periodico ogni 2 minuti se la tab è attiva
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reloadFn()
      }
    }, 2 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleVisibility)
      clearInterval(interval)
    }
  }, [reloadFn])
}
