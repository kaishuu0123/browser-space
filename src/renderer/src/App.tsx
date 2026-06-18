import React, { useState, useEffect, useCallback } from 'react'
import { useProfiles, useActiveProfile, useSidebarCollapsed } from './hooks/useProfile'
import { Sidebar } from './components/Sidebar'
import { SettingsModal } from './components/SettingsModal'
import { CrashedView } from './components/CrashedView'

function App(): React.ReactElement {
  const { profiles, loading: profilesLoading, refreshProfiles } = useProfiles()
  const { activeProfileId, setActive } = useActiveProfile()
  const { collapsed, setCollapsed } = useSidebarCollapsed()
  const [showSettings, setShowSettings] = useState(false)
  const [crashedProfileIds, setCrashedProfileIds] = useState<Set<string>>(new Set())
  const [, forceUpdate] = useState({})
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null)

  useEffect(() => {
    window.electron.ipcRenderer.on('update-downloaded', (_event, info) => {
      setUpdateInfo(info)
    })
  }, [])

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

  const isActiveCrashed = activeProfileId !== null && crashedProfileIds.has(activeProfileId)

  // Hide profileView and expand rendererView when settings open OR active profile crashed
  useEffect(() => {
    if (showSettings || isActiveCrashed) {
      window.settingsApi.notifyModalOpen()
      if (activeProfileId) window.profileApi.switch(null)
    } else {
      window.settingsApi.notifyModalClose()
      if (activeProfileId) window.profileApi.switch(activeProfileId)
    }
  }, [showSettings, activeProfileId, isActiveCrashed])

  const handleProfileClick = (profileId: string) => {
    window.profileApi.switch(profileId)
    setActive(profileId)
  }

  const handleReloadClick = useCallback(async () => {
    if (activeProfileId) {
      await window.profileApi.reload()
      setCrashedProfileIds((prev) => {
        const next = new Set(prev)
        next.delete(activeProfileId)
        return next
      })
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
        onSettingsClick={() => setShowSettings(true)}
        onReloadClick={handleReloadClick}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        hasUpdate={updateInfo !== null}
        crashedProfileIds={crashedProfileIds}
      />

      {isActiveCrashed && <CrashedView onReload={handleReloadClick} />}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onProfilesChange={refreshProfiles}
      />
    </>
  )
}

export default App
