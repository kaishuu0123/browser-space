import React, { useState, useEffect } from 'react'
import { Profile } from '../../../shared/types'
import { useProfileOperations } from '../hooks/useProfile'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Button } from './ui/button'
import { ProfileForm } from './ProfileForm'
import { SortableProfileList } from './SortableProfileList'
import { ClearDataDialog } from './ClearDataDialog'
import appIcon from '../../../assets/icon.png'

type UpdateStatus = 'checking' | 'up-to-date' | 'available' | 'downloaded' | 'error'

function AboutTabContent(): React.ReactElement {
  const [version] = useState(() => window.updaterApi.getAppVersion())
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('checking')
  const [latestVersion, setLatestVersion] = useState('')
  const [isDevError, setIsDevError] = useState(false)

  useEffect(() => {
    window.updaterApi.checkForUpdates()

    const onChecking = () => setUpdateStatus('checking')
    const onNotAvailable = () => setUpdateStatus('up-to-date')
    const onAvailable = (_e, info: { version: string }) => {
      setUpdateStatus('available')
      setLatestVersion(info.version)
    }
    const onDownloaded = (_e, info: { version: string }) => {
      setUpdateStatus('downloaded')
      setLatestVersion(info.version)
    }
    const onError = (_e, msg: string) => {
      setIsDevError(msg === 'dev')
      setUpdateStatus('error')
    }

    window.electron.ipcRenderer.on('update-checking', onChecking)
    window.electron.ipcRenderer.on('update-not-available', onNotAvailable)
    window.electron.ipcRenderer.on('update-available', onAvailable)
    window.electron.ipcRenderer.on('update-downloaded', onDownloaded)
    window.electron.ipcRenderer.on('update-error', onError)

    return () => {
      window.electron.ipcRenderer.removeListener('update-checking', onChecking)
      window.electron.ipcRenderer.removeListener('update-not-available', onNotAvailable)
      window.electron.ipcRenderer.removeListener('update-available', onAvailable)
      window.electron.ipcRenderer.removeListener('update-downloaded', onDownloaded)
      window.electron.ipcRenderer.removeListener('update-error', onError)
    }
  }, [])

  const renderUpdateStatus = () => {
    switch (updateStatus) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Checking for updates...</span>
          </div>
        )
      case 'up-to-date':
        return <p className="text-sm text-green-600">✓ Up to date</p>
      case 'available':
        return (
          <p className="text-sm text-blue-600">
            ↑ v{latestVersion} available (downloading...)
          </p>
        )
      case 'downloaded':
        return (
          <div className="flex items-center gap-2">
            <p className="text-sm text-green-600">✓ v{latestVersion} ready to install</p>
            <Button size="sm" onClick={() => window.updaterApi.installUpdate()}>
              Restart and update
            </Button>
          </div>
        )
      case 'error':
        return (
          <p className="text-sm text-gray-400">
            {isDevError ? '— Not available in development' : '✗ Failed to check for updates'}
          </p>
        )
    }
  }

  return (
    <div className="py-6 flex flex-col items-center gap-4">
      <img src={appIcon} className="w-20 h-20 rounded-2xl" alt="Browser Space" />
      <div className="text-center">
        <h2 className="text-xl font-semibold">Browser Space</h2>
        <p className="text-sm text-gray-500 mt-1">Version {version}</p>
      </div>
      <div className="mt-2">{renderUpdateStatus()}</div>
    </div>
  )
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onProfilesChange: () => void
}

export function SettingsModal({
  open,
  onClose,
  onProfilesChange,
}: SettingsModalProps): React.ReactElement {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { createProfile, updateProfile, deleteProfile, getDataPath, reorderProfiles } =
    useProfileOperations()
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [clearDataProfile, setClearDataProfile] = useState<Profile | null>(null)
  const [launchOnStartup, setLaunchOnStartup] = useState(false)

  // Load profiles when modal opens
  useEffect(() => {
    if (open) {
      loadProfiles()
      loadLaunchOnStartup()
    }
  }, [open])

  const loadProfiles = async () => {
    const allProfiles = await window.profileApi.getAll()
    setProfiles(allProfiles)
  }

  const loadLaunchOnStartup = async () => {
    const enabled = await window.settingsApi.getLaunchOnStartup()
    setLaunchOnStartup(enabled)
  }

  const handleLaunchOnStartupChange = async (checked: boolean) => {
    setLaunchOnStartup(checked)
    await window.settingsApi.setLaunchOnStartup(checked)
  }

  const handleCreateClick = () => {
    setEditingProfile(null)
    setShowForm(true)
  }

  const handleEditClick = (profile: Profile) => {
    setEditingProfile(profile)
    setShowForm(true)
  }

  const handleFormSubmit = async (
    data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>
  ) => {
    try {
      if (editingProfile) {
        await updateProfile(editingProfile.id, data)
      } else {
        await createProfile(data)
      }
      await loadProfiles()
      onProfilesChange() // Notify parent to refresh
      setShowForm(false)
      setEditingProfile(null)
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert('Failed to save profile')
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingProfile(null)
  }

  const handleDeleteClick = async (profile: Profile) => {
    if (
      !confirm(
        `Are you sure you want to delete "${profile.name}"?\n\nThis will also delete all cookies and session data for this profile.`
      )
    ) {
      return
    }

    try {
      await deleteProfile(profile.id)
      await loadProfiles()
      onProfilesChange() // Notify parent to refresh
    } catch (error) {
      console.error('Failed to delete profile:', error)
      alert('Failed to delete profile')
    }
  }

  const handleShowDataPath = async (profile: Profile) => {
    try {
      const path = await getDataPath(profile.id)
      alert(`Data path for "${profile.name}":\n\n${path}`)
    } catch (error) {
      console.error('Failed to get data path:', error)
      alert('Failed to get data path')
    }
  }

  const handleReorder = async (reorderedProfiles: Profile[]) => {
    try {
      const orderedIds = reorderedProfiles.map((p) => p.id)
      await reorderProfiles(orderedIds)
      await loadProfiles()
      onProfilesChange() // Notify parent to refresh
    } catch (error) {
      console.error('Failed to reorder profiles:', error)
      alert('Failed to reorder profiles')
    }
  }

  const handleClearDataClick = (profile: Profile) => {
    setClearDataProfile(profile)
  }

  const handleClearData = async (
    profileId: string,
    options: {
      cookies: boolean
      cache: boolean
      appData: boolean
    }
  ) => {
    await window.profileApi.clearData(profileId, options)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="profiles">Manage Profiles</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="launch-on-startup">Launch on startup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically start Browser Space when you log in
                  </p>
                </div>
                <Switch
                  id="launch-on-startup"
                  checked={launchOnStartup}
                  onCheckedChange={handleLaunchOnStartupChange}
                />
              </div>
            </TabsContent>

            {/* Manage Profiles Tab */}
            <TabsContent value="profiles" className="space-y-4">
              {showForm ? (
                <ProfileForm
                  profile={editingProfile || undefined}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                />
              ) : (
                <div className="space-y-4">
                  {/* Create Button */}
                  <Button onClick={handleCreateClick} className="w-full">
                    <span className="codicon codicon-add mr-2" />
                    Create New Profile
                  </Button>

                  {/* Profile List with D&D */}
                  <SortableProfileList
                    profiles={profiles}
                    onReorder={handleReorder}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onShowDataPath={handleShowDataPath}
                    onClearData={handleClearDataClick}
                  />
                </div>
              )}
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <AboutTabContent />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ClearDataDialog
        profile={clearDataProfile}
        open={clearDataProfile !== null}
        onClose={() => setClearDataProfile(null)}
        onClear={handleClearData}
      />
    </>
  )
}
