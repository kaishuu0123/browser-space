import { Profile } from './types'

// IPC channel names
export const IPC_CHANNELS = {
  // Profile operations
  PROFILE_GET_ALL: 'profile:getAll',
  PROFILE_GET_BY_ID: 'profile:getById',
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_REORDER: 'profile:reorder',

  // Active profile
  PROFILE_GET_ACTIVE: 'profile:getActive',
  PROFILE_SET_ACTIVE: 'profile:setActive',
  PROFILE_SWITCH: 'profile:switch', // Switch and show BrowserView
  PROFILE_RELOAD: 'profile:reload', // Reload active profile

  // Settings
  SETTINGS_GET_SIDEBAR_COLLAPSED: 'settings:getSidebarCollapsed',
  SETTINGS_SET_SIDEBAR_COLLAPSED: 'settings:setSidebarCollapsed',
  SETTINGS_MODAL_OPEN: 'settings:modalOpen',
  SETTINGS_MODAL_CLOSE: 'settings:modalClose',
  SETTINGS_GET_LAUNCH_ON_STARTUP: 'settings:getLaunchOnStartup',
  SETTINGS_SET_LAUNCH_ON_STARTUP: 'settings:setLaunchOnStartup',

  // Profile data path
  PROFILE_GET_DATA_PATH: 'profile:getDataPath',

  // Notification permission
  NOTIFICATION_REQUEST_PERMISSION: 'notification:requestPermission',

  // Custom icon upload
  ICON_UPLOAD: 'icon:upload',
  ICON_GET_PATH: 'icon:getPath',

  // Clear profile data
  PROFILE_CLEAR_DATA: 'profile:clearData',

  // Page search
  SEARCH_IN_PAGE: 'search:inPage',
  SEARCH_STOP: 'search:stop',
} as const

// IPC API type definitions for renderer
export interface ProfileAPI {
  // Get all profiles
  getAll: () => Promise<Profile[]>

  // Get profile by ID
  getById: (id: string) => Promise<Profile | null>

  // Create new profile
  create: (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<Profile>

  // Update profile
  update: (id: string, data: Partial<Profile>) => Promise<Profile | null>

  // Delete profile
  delete: (id: string) => Promise<boolean>

  // Reorder profiles
  reorder: (orderedIds: string[]) => Promise<boolean>

  // Get active profile ID
  getActive: () => Promise<string | null>

  // Set active profile (store only)
  setActive: (id: string | null) => Promise<void>

  // Switch profile (store + show BrowserView)
  switch: (id: string | null) => Promise<void>

  // Reload active profile
  reload: () => Promise<void>

  // Get profile data directory path
  getDataPath: (profileId: string) => Promise<string>

  // Clear profile data (cookies, cache, etc.)
  clearData: (
    profileId: string,
    options: {
      cookies?: boolean
      cache?: boolean
      appData?: boolean
    }
  ) => Promise<void>
}

export interface SettingsAPI {
  // Get sidebar collapsed state
  getSidebarCollapsed: () => Promise<boolean>

  // Set sidebar collapsed state
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>

  // Notify main process that settings modal opened/closed
  notifyModalOpen: () => Promise<void>
  notifyModalClose: () => Promise<void>

  // Launch on startup
  getLaunchOnStartup: () => Promise<boolean>
  setLaunchOnStartup: (enabled: boolean) => Promise<void>
}

// Icon API for custom icon upload
export interface IconAPI {
  // Upload custom icon (base64) and return filename
  upload: (base64Data: string) => Promise<string>

  // Get full path to custom icon
  getPath: (filename: string) => Promise<string>
}

// Search API for page search
export interface SearchAPI {
  // Search in current page
  searchInPage: (text: string, options?: { forward?: boolean; findNext?: boolean }) => Promise<void>

  // Stop search and clear selection
  stopSearch: () => Promise<void>
}
