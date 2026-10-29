import type { ChromeState } from './layout'

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

  // Minimal mode: no tab bar and no address bar, so the page gets the whole height. The tab bar
  // comes back while the profile has more than one tab; Ctrl/Cmd+L shows the address bar.
  minimalMode?: boolean

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
  activeProfileId: null,
}

export type UpdateState = {
  status: 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloaded' | 'error'
  version?: string
  // 'dev' は開発環境(未パッケージ)で確認できないことを表す
  error?: string
}

// Navigation state of the active page, shown in the toolbar
export interface NavigationState {
  profileId: string
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  loading: boolean
}

// A tab as shown in the tab bar
// What the certificate of a site says about it
export interface CertDetails {
  subject?: string
  issuer?: string
  // Validity in seconds since the epoch
  validFrom?: number
  validTo?: number
  fingerprint?: string
}

// A page that could not be loaded because of its certificate (expired, self-signed, wrong host...)
export interface CertErrorInfo extends CertDetails {
  url: string
  hostname: string
  // Chromium's error name, e.g. ERR_CERT_AUTHORITY_INVALID
  error: string
}

// A page that could not be reached (offline, DNS failure, connection refused, timeout...)
export interface LoadErrorInfo {
  url: string
  // Chromium's error name, e.g. ERR_INTERNET_DISCONNECTED
  error: string
  // The computer itself has no network (as opposed to the site being unreachable)
  offline: boolean
}

export interface TabInfo {
  id: number
  title: string
  url: string
  // Favicon URL of the page (empty until the page reports one)
  favicon: string
  loading: boolean
  crashed: boolean
  // Set while the page is blocked by a certificate error (its view is hidden)
  certError?: CertErrorInfo
  // The page loaded because the user chose to trust its invalid certificate
  certBypassed?: boolean
  // Set while the page could not be reached (its view is hidden)
  loadError?: LoadErrorInfo
}

// Tabs of the active profile
export interface TabsState {
  profileId: string
  // Bars shown above the page (decided by the main process, which places the page)
  chrome: ChromeState
  activeTabId: number
  tabs: TabInfo[]
}
