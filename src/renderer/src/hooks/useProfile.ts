import { useState, useEffect, useCallback } from 'react'
import { Profile } from '../../../shared/types'

// Hook to get all profiles
export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProfiles = useCallback(async () => {
    try {
      const data = await window.profileApi.getAll()
      setProfiles(data)
    } catch (error) {
      console.error('Failed to fetch profiles:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
  }, [refreshProfiles])

  return { profiles, loading, refreshProfiles }
}

// Hook to get active profile ID
export function useActiveProfile() {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshActiveProfile = useCallback(async () => {
    try {
      const id = await window.profileApi.getActive()
      setActiveProfileId(id)
    } catch (error) {
      console.error('Failed to fetch active profile:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const setActive = useCallback(async (id: string | null) => {
    try {
      await window.profileApi.setActive(id)
      setActiveProfileId(id)
    } catch (error) {
      console.error('Failed to set active profile:', error)
    }
  }, [])

  useEffect(() => {
    refreshActiveProfile()
  }, [refreshActiveProfile])

  return { activeProfileId, setActive, loading, refreshActiveProfile }
}

// Hook to get sidebar collapsed state
export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadState = async () => {
      try {
        const state = await window.settingsApi.getSidebarCollapsed()
        setCollapsedState(state)
      } catch (error) {
        console.error('Failed to fetch sidebar state:', error)
      } finally {
        setLoading(false)
      }
    }
    loadState()
  }, [])

  const setCollapsed = useCallback(async (value: boolean) => {
    try {
      await window.settingsApi.setSidebarCollapsed(value)
      setCollapsedState(value)
    } catch (error) {
      console.error('Failed to set sidebar state:', error)
    }
  }, [])

  return { collapsed, setCollapsed, loading }
}

// Hook for profile operations
export function useProfileOperations() {
  const createProfile = useCallback(
    async (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      try {
        const newProfile = await window.profileApi.create(data)
        return newProfile
      } catch (error) {
        console.error('Failed to create profile:', error)
        throw error
      }
    },
    []
  )

  const updateProfile = useCallback(async (id: string, data: Partial<Profile>) => {
    try {
      const updated = await window.profileApi.update(id, data)
      return updated
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  }, [])

  const deleteProfile = useCallback(async (id: string) => {
    try {
      const success = await window.profileApi.delete(id)
      return success
    } catch (error) {
      console.error('Failed to delete profile:', error)
      throw error
    }
  }, [])

  const reorderProfiles = useCallback(async (orderedIds: string[]) => {
    try {
      const success = await window.profileApi.reorder(orderedIds)
      return success
    } catch (error) {
      console.error('Failed to reorder profiles:', error)
      throw error
    }
  }, [])

  const getDataPath = useCallback(async (profileId: string) => {
    try {
      const path = await window.profileApi.getDataPath(profileId)
      return path
    } catch (error) {
      console.error('Failed to get data path:', error)
      throw error
    }
  }, [])

  return {
    createProfile,
    updateProfile,
    deleteProfile,
    reorderProfiles,
    getDataPath
  }
}
