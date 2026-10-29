import { useEffect, useState } from 'react'
import type { NavigationState } from '../../../shared/types'

// Hook to follow the navigation state (URL, history, loading) of the active page
export function useNavigationState(): NavigationState | null {
  const [state, setState] = useState<NavigationState | null>(null)

  useEffect(() => {
    window.navigationApi.getState().then(setState)
    return window.navigationApi.onState(setState)
  }, [])

  return state
}
