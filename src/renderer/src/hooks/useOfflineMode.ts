import { useEffect, useState } from 'react'

// Hook to follow the "work offline" switch
export function useOfflineMode(): boolean {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    window.navigationApi.getOffline().then(setOffline)
    return window.navigationApi.onOfflineChanged(setOffline)
  }, [])

  return offline
}
