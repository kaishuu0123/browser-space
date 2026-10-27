import type React from 'react'
import { useEffect, useState } from 'react'
import appIcon from '../../../../resources/icon.png'
import type { Profile, UpdateState } from '../../../shared/types'
import { useProfileOperations } from '../hooks/useProfile'
import { ClearDataDialog } from './ClearDataDialog'
import { ProfileForm } from './ProfileForm'
import { SortableProfileList } from './SortableProfileList'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

function AboutTabContent({ updateState }: { updateState: UpdateState }): React.ReactElement {
  const [version] = useState(() => window.updaterApi.getAppVersion())
  const [copied, setCopied] = useState(false)

  // 開くたびに確認する(確認中・DL中・DL済みなら main 側で何もしない)
  useEffect(() => {
    window.updaterApi.checkForUpdates()
  }, [])

  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(updateState.error ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const checkAgainButton = (
    <button
      type="button"
      onClick={() => window.updaterApi.checkForUpdates()}
      title="Check for updates"
      className="cursor-pointer text-gray-400 hover:text-gray-600"
    >
      <span aria-hidden="true" className="codicon codicon-refresh" />
    </button>
  )

  const renderUpdateStatus = () => {
    switch (updateState.status) {
      case 'idle':
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              aria-hidden="true"
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Checking for updates...</span>
          </div>
        )
      case 'up-to-date':
        return (
          <div className="flex items-center gap-2">
            <p className="text-sm text-green-600">✓ Up to date</p>
            {checkAgainButton}
          </div>
        )
      case 'available':
        return (
          <p className="text-sm text-blue-600">
            ↑ v{updateState.version} available (downloading...)
          </p>
        )
      case 'downloaded':
        return (
          <div className="flex items-center gap-2">
            <p className="text-sm text-green-600">✓ v{updateState.version} ready to install</p>
            <Button size="sm" onClick={() => window.updaterApi.installUpdate()}>
              Restart and update
            </Button>
          </div>
        )
      case 'error':
        if (updateState.error === 'dev') {
          return <p className="text-sm text-gray-400">— Not available in development</p>
        }
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyError}
              title={`${updateState.error}\n\nClick to copy error details`}
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
            >
              <span>✗ Failed to check for updates</span>
              <span
                aria-hidden="true"
                className={`codicon ${copied ? 'codicon-check text-green-600' : 'codicon-copy'}`}
              />
              {copied && <span className="text-green-600">Copied</span>}
            </button>
            {checkAgainButton}
          </div>
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
  updateState: UpdateState
}

export function SettingsModal({
  open,
  onClose,
  onProfilesChange,
  updateState,
}: SettingsModalProps): React.ReactElement {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { createProfile, updateProfile, deleteProfile, getDataPath, reorderProfiles } =
    useProfileOperations()
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [clearDataProfile, setClearDataProfile] = useState<Profile | null>(null)
  const [launchOnStartup, setLaunchOnStartup] = useState(false)

  // Load profiles when modal opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadProfiles/loadLaunchOnStartup are re-created every render; deps intentionally left as [open] so the effect only runs when the modal opens (existing behavior preserved)
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
              <AboutTabContent updateState={updateState} />
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
