import { v4 as uuidv4 } from 'uuid'
import store from './store'
import { Profile } from '../shared/types'

import { app } from 'electron'
import path from 'path'

// Get all profiles
export function getAllProfiles(): Profile[] {
  return store.get('profiles', [])
}

// Get profile by ID
export function getProfileById(id: string): Profile | undefined {
  const profiles = getAllProfiles()
  return profiles.find((p) => p.id === id)
}

// Create new profile
export function createProfile(
  data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>
): Profile {
  const profiles = getAllProfiles()
  const now = Date.now()

  const newProfile: Profile = {
    ...data,
    id: uuidv4(),
    order: profiles.length,
    createdAt: now,
    updatedAt: now,
  }

  profiles.push(newProfile)
  store.set('profiles', profiles)

  return newProfile
}

// Update profile
export function updateProfile(id: string, data: Partial<Profile>): Profile | null {
  const profiles = getAllProfiles()
  const index = profiles.findIndex((p) => p.id === id)

  if (index === -1) {
    return null
  }

  const updatedProfile: Profile = {
    ...profiles[index],
    ...data,
    id: profiles[index].id, // Prevent ID change
    createdAt: profiles[index].createdAt, // Prevent createdAt change
    updatedAt: Date.now(),
  }

  profiles[index] = updatedProfile
  store.set('profiles', profiles)

  return updatedProfile
}

// Delete profile
export function deleteProfile(id: string): boolean {
  const profiles = getAllProfiles()
  const filteredProfiles = profiles.filter((p) => p.id !== id)

  if (filteredProfiles.length === profiles.length) {
    return false // Profile not found
  }

  store.set('profiles', filteredProfiles)

  // If deleted profile was active, clear active profile
  const activeProfileId = store.get('activeProfileId')
  if (activeProfileId === id) {
    store.set('activeProfileId', null)
  }

  return true
}

// Reorder profiles
export function reorderProfiles(orderedIds: string[]): boolean {
  const profiles = getAllProfiles()

  // Validate that all IDs exist
  if (orderedIds.length !== profiles.length) {
    return false
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const reorderedProfiles = orderedIds
    .map((id, index) => {
      const profile = profileMap.get(id)
      if (!profile) return null
      return { ...profile, order: index }
    })
    .filter((p): p is Profile => p !== null)

  if (reorderedProfiles.length !== profiles.length) {
    return false
  }

  store.set('profiles', reorderedProfiles)
  return true
}

// Get active profile ID
export function getActiveProfileId(): string | null {
  return store.get('activeProfileId', null)
}

// Set active profile
export function setActiveProfileId(id: string | null): void {
  store.set('activeProfileId', id)
}

// Get sidebar collapsed state
export function getSidebarCollapsed(): boolean {
  return store.get('sidebarCollapsed', false)
}

// Set sidebar collapsed state
export function setSidebarCollapsed(collapsed: boolean): void {
  store.set('sidebarCollapsed', collapsed)
}

// Get profile data directory path
export function getProfileDataPath(profileId: string): string {
  return path.join(app.getPath('userData'), 'profiles', profileId)
}
