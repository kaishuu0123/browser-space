// Profile type definition
export interface Profile {
  id: string // Unique ID (UUID)
  name: string // Profile name (e.g., "Work Gmail")
  homeUrl: string // Initial URL to display
  icon: string // Codicon icon name (e.g., "account", "mail") or 'custom' for uploaded image
  iconColor: string // Icon color (hex, e.g., "#3B82F6")
  customIconPath?: string // Path to custom uploaded icon (relative to userData/icons/)
  order: number // Display order
  createdAt: number // Creation timestamp
  updatedAt: number // Update timestamp

  // Language settings
  language?: string // BCP 47 language tag (e.g., 'en-US', 'ja-JP'). If undefined, use system default

  // Notification settings
  notificationMode: 'allow-all' | 'ask' | 'deny-all' // Global notification permission mode
  notificationPermissions: {
    // Per-site notification permission state (used when notificationMode is 'ask')
    [domain: string]: 'granted' | 'denied' | 'default'
  }
}

// Application settings
export interface AppSettings {
  sidebarCollapsed: boolean // Sidebar collapsed state
  profiles: Profile[] // Profile list
  activeProfileId: string | null // Currently active profile ID
}

// Default settings
export const defaultSettings: AppSettings = {
  sidebarCollapsed: false,
  profiles: [],
  activeProfileId: null
}
