import React, { useState, useEffect } from 'react'
import { Profile } from '../../../shared/types'
import { useProfileOperations } from '../hooks/useProfile'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { ProfileForm } from './ProfileForm'
import { SortableProfileList } from './SortableProfileList'
import { ClearDataDialog } from './ClearDataDialog'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onProfilesChange: () => void
}

export function SettingsModal({
  open,
  onClose,
  onProfilesChange
}: SettingsModalProps): React.ReactElement {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { createProfile, updateProfile, deleteProfile, getDataPath, reorderProfiles } =
    useProfileOperations()
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [clearDataProfile, setClearDataProfile] = useState<Profile | null>(null)

  // Load profiles when modal opens
  useEffect(() => {
    if (open) {
      loadProfiles()
    }
  }, [open])

  const loadProfiles = async () => {
    const allProfiles = await window.profileApi.getAll()
    setProfiles(allProfiles)
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
          <DialogTitle>
            {showForm ? (editingProfile ? 'Edit Profile' : 'Create Profile') : 'Manage Profiles'}
          </DialogTitle>
        </DialogHeader>

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
