import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_DEFAULT,
  TAB_BAR_HEIGHT,
  TOOLBAR_HEIGHT,
} from '../../shared/layout'
import { CrashedView } from './components/CrashedView'
import { SettingsModal, type SettingsTab } from './components/SettingsModal'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { Toolbar } from './components/Toolbar'
import { useNavigationState } from './hooks/useNavigationState'
import {
  useActiveProfile,
  useProfiles,
  useSidebarCollapsed,
  useSidebarWidth,
} from './hooks/useProfile'
import { useTabsState } from './hooks/useTabsState'
import { useUpdateState } from './hooks/useUpdateState'

function App(): React.ReactElement {
  const { profiles, loading: profilesLoading, refreshProfiles } = useProfiles()
  const { activeProfileId, setActive } = useActiveProfile()
  const { collapsed, setCollapsed } = useSidebarCollapsed()
  const { width: expandedWidth, setWidth: setSidebarWidth } = useSidebarWidth()
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : expandedWidth
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<{ name: SettingsTab }>({ name: 'general' })

  const openSettings = useCallback((name: SettingsTab) => {
    setSettingsTab({ name })
    setShowSettings(true)
  }, [])

  // Application menu (macOS) -> About / Check for Updates (Settings の About タブ)
  useEffect(() => {
    const removeAbout = window.electron.ipcRenderer.on('menu-about', () => openSettings('about'))
    const removeCheckForUpdates = window.electron.ipcRenderer.on('menu-check-for-updates', () =>
      openSettings('about')
    )
    return () => {
      removeAbout()
      removeCheckForUpdates()
    }
  }, [openSettings])
  const [crashedProfileIds, setCrashedProfileIds] = useState<Set<string>>(new Set())
  const [, forceUpdate] = useState({})
  const updateState = useUpdateState()
  const navigationState = useNavigationState()
  const tabsState = useTabsState()
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | undefined>()

  // Listen for view crash
  useEffect(() => {
    const cleanup = window.profileApi.onViewCrashed((profileId) => {
      setCrashedProfileIds((prev) => new Set(prev).add(profileId))
    })
    return cleanup
  }, [])

  // Window resize
  useEffect(() => {
    const handler = () => forceUpdate({})
    const removeIpcListener = window.electron?.ipcRenderer?.on('window-resized', handler)
    window.addEventListener('resize', handler)
    return () => {
      // IPC リスナーの削除（存在する場合のみ）
      removeIpcListener?.()
      window.removeEventListener('resize', handler)
    }
  }, [])

  // A crash only affects one tab: the main process hides that tab's view and the error screen
  // takes its place, while the tab bar and toolbar stay usable
  const isActiveCrashed = tabsState?.tabs.some(
    (tab) => tab.id === tabsState.activeTabId && tab.crashed
  )

  // The profile no longer has a crashed tab (reloaded or closed): clear its sidebar mark
  useEffect(() => {
    if (!tabsState || tabsState.tabs.some((tab) => tab.crashed)) return
    setCrashedProfileIds((prev) => {
      if (!prev.has(tabsState.profileId)) return prev
      const next = new Set(prev)
      next.delete(tabsState.profileId)
      return next
    })
  }, [tabsState])

  // Hide profileView and expand rendererView when settings open
  useEffect(() => {
    if (showSettings) {
      window.settingsApi.notifyModalOpen()
      if (activeProfileId) window.profileApi.switch(null)
    } else {
      window.settingsApi.notifyModalClose()
      if (activeProfileId) window.profileApi.switch(activeProfileId)
    }
  }, [showSettings, activeProfileId])

  const handleProfileClick = (profileId: string) => {
    window.profileApi.switch(profileId)
    setActive(profileId)
  }

  const handleReloadClick = useCallback(async () => {
    if (activeProfileId) {
      await window.profileApi.reload()
    }
  }, [activeProfileId])

  if (profilesLoading) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <span className="codicon codicon-loading codicon-modifier-spin text-4xl text-blue-500 mb-4 block" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileClick={handleProfileClick}
        onSettingsClick={() => openSettings('general')}
        onReloadClick={handleReloadClick}
        collapsed={collapsed}
        width={expandedWidth}
        onResize={setSidebarWidth}
        onResetWidth={() => setSidebarWidth(SIDEBAR_WIDTH_DEFAULT, true)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        hasUpdate={updateState.status === 'downloaded'}
        updateVersion={
          updateState.status === 'downloaded' && updateState.version !== dismissedUpdateVersion
            ? updateState.version
            : undefined
        }
        onInstallUpdate={() => window.updaterApi.installUpdate()}
        onDismissUpdate={() => setDismissedUpdateVersion(updateState.version)}
        crashedProfileIds={crashedProfileIds}
      />

      {activeProfileId && !showSettings && (
        <>
          <TabBar state={tabsState} left={sidebarWidth} />
          <Toolbar state={navigationState} left={sidebarWidth} onReload={handleReloadClick} />
        </>
      )}

      {isActiveCrashed && !showSettings && (
        <div
          className="fixed right-0 bottom-0 transition-all duration-200"
          style={{ left: sidebarWidth, top: TAB_BAR_HEIGHT + TOOLBAR_HEIGHT }}
        >
          <CrashedView onReload={handleReloadClick} />
        </div>
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onProfilesChange={refreshProfiles}
        updateState={updateState}
        initialTab={settingsTab}
      />
    </>
  )
}

export default App
