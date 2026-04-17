import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useAutoRefresh(reloadFn: () => void | Promise<void>) {
  const location = useLocation()

  useEffect(() => {
    reloadFn()
  }, [location.pathname])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') reloadFn()
    }
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('focus', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }, [reloadFn])
}
