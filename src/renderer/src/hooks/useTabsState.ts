import { useEffect, useState } from 'react'
import type { TabsState } from '../../../shared/types'

// Hook to follow the tabs of the active profile
export function useTabsState(): TabsState | null {
  const [state, setState] = useState<TabsState | null>(null)

  useEffect(() => {
    window.tabsApi.getState().then(setState)
    return window.tabsApi.onState(setState)
  }, [])

  return state
}
