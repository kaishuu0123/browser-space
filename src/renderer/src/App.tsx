import React, { useState, useEffect } from 'react'
import { useProfiles, useActiveProfile, useSidebarCollapsed } from './hooks/useProfile'
import { Sidebar } from './components/Sidebar'
import { SettingsModal } from './components/SettingsModal'
import { Button } from './components/ui/button'

function App(): React.ReactElement {
  const { profiles, loading: profilesLoading, refreshProfiles } = useProfiles()
  const { activeProfileId, setActive } = useActiveProfile()
  const { collapsed, setCollapsed } = useSidebarCollapsed()
  const [showSettings, setShowSettings] = useState(false)
  const [, forceUpdate] = useState({})
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null)

  useEffect(() => {
    window.electron.ipcRenderer.on('update-downloaded', (_event, info) => {
      setUpdateInfo(info)
    })
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

  const handleReloadClick = () => {
    window.profileApi.reload()
  }

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
      {updateInfo && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 text-gray-900 p-3 rounded-lg shadow-md flex gap-3 items-center">
          <span className="text-sm">アップデート v{updateInfo.version} が利用可能です</span>
          <Button size="sm" onClick={() => window.updaterApi.installUpdate()}>
            再起動して更新
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setUpdateInfo(null)}>
            後で
          </Button>
        </div>
      )}

      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileClick={handleProfileClick}
        onSettingsClick={() => setShowSettings(true)}
        onReloadClick={handleReloadClick}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onProfilesChange={refreshProfiles}
      />
    </>
  )
}

export default App
