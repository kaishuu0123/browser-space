import { app, type BaseWindow, ipcMain, type WebContentsView } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import {
  activateTab,
  closeTab,
  getBrowserView,
  getNavigationState,
  getTabsState,
  hideAllBrowserViews,
  isOfflineMode,
  leaveCertError,
  newTab,
  proceedCertError,
  recreateBrowserView,
  refreshProfileChrome,
  releaseToolbar,
  reloadActiveTab,
  removeBrowserView,
  setOfflineMode,
  showBrowserView,
  showCertInfo,
  updateBrowserViewBounds,
} from './browserViewManager'
import { type ClearDataOptions, clearProfileData } from './dataCleaner'
import { getCustomIconPath, saveCustomIcon } from './iconManager'
import { setExpandedSidebarWidth } from './layout'
import {
  createProfile,
  deleteProfile,
  getActiveProfileId,
  getAllProfiles,
  getProfileById,
  getProfileDataPath,
  reorderProfiles,
  setActiveProfileId,
  updateProfile,
} from './profileManager'
import {
  getLaunchOnStartup,
  getSidebarCollapsed,
  getSidebarWidth,
  setLaunchOnStartup,
  setSidebarCollapsed,
  setSidebarWidth,
} from './settingsManager'

function getActiveView(): WebContentsView | undefined {
  const activeProfileId = getActiveProfileId()
  return activeProfileId ? getBrowserView(activeProfileId) : undefined
}

// Turn what was typed in the address bar into a URL to load (http/https only).
// Text that does not look like a URL is searched instead.
function resolveNavigationInput(input: string): string | null {
  const text = input.trim()
  if (!text) return null

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  const looksLikeHost = !/\s/.test(text) && (text.includes('.') || text.startsWith('localhost'))
  // localhost and IP addresses are local servers that usually have no TLS
  const isLocal = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#]|$)/i.test(text)
  const candidate = hasScheme
    ? text
    : looksLikeHost
      ? `${isLocal ? 'http' : 'https'}://${text}`
      : null
  if (!candidate) return `https://www.google.com/search?q=${encodeURIComponent(text)}`

  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch (_e) {
    return null
  }
}

function getMainWindow(): BaseWindow | null {
  return global.__mainWindow ?? null
}

export function setupIpcHandlers(): void {
  // Profile: Get all
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_ALL, async () => {
    return getAllProfiles()
  })

  // Profile: Get by ID
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_BY_ID, async (_, id: string) => {
    return getProfileById(id)
  })

  // Profile: Create
  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, async (_, data) => {
    return createProfile(data)
  })

  // Profile: Update
  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (_, id: string, data) => {
    const oldProfile = getProfileById(id)
    const updated = updateProfile(id, data)

    // Minimal mode changes which bars are shown above the page
    if (updated && oldProfile && !!oldProfile.minimalMode !== !!updated.minimalMode) {
      const mainWindow = getMainWindow()
      if (mainWindow) refreshProfileChrome(id, mainWindow)
    }

    // If language changed and this is the active profile, recreate BrowserView
    if (updated && oldProfile && oldProfile.language !== updated.language) {
      const activeProfileId = getActiveProfileId()
      if (activeProfileId === id) {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          recreateBrowserView(id, mainWindow)
        }
      }
    }

    return updated
  })

  // Profile: Delete
  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, async (_, id: string) => {
    const success = deleteProfile(id)

    // Remove BrowserView if exists
    if (success) {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        removeBrowserView(id, mainWindow)
      }
    }

    return success
  })

  // Profile: Reorder
  ipcMain.handle(IPC_CHANNELS.PROFILE_REORDER, async (_, orderedIds: string[]) => {
    return reorderProfiles(orderedIds)
  })

  // Profile: Get active
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_ACTIVE, async () => {
    return getActiveProfileId()
  })

  // Profile: Set active (store only, no UI change)
  ipcMain.handle(IPC_CHANNELS.PROFILE_SET_ACTIVE, async (_, id: string | null) => {
    setActiveProfileId(id)
  })

  // Profile: Switch (store + show BrowserView)
  ipcMain.handle(IPC_CHANNELS.PROFILE_SWITCH, async (_, id: string | null) => {
    setActiveProfileId(id)

    const mainWindow = getMainWindow()
    if (!mainWindow) return

    if (id) {
      showBrowserView(id, mainWindow)
    } else {
      hideAllBrowserViews(mainWindow)
    }
  })

  // Profile: Reload the active tab (a crashed tab is recreated)
  ipcMain.handle(IPC_CHANNELS.PROFILE_RELOAD, async () => {
    const activeProfileId = getActiveProfileId()
    const mainWindow = getMainWindow()
    if (activeProfileId && mainWindow) reloadActiveTab(activeProfileId, mainWindow)
  })

  // Navigation: state of the active page
  ipcMain.handle(IPC_CHANNELS.NAVIGATION_GET_STATE, async () => {
    const activeProfileId = getActiveProfileId()
    return activeProfileId ? getNavigationState(activeProfileId) : null
  })

  // Navigation: back / forward / navigate operate on the active page
  ipcMain.handle(IPC_CHANNELS.NAVIGATION_BACK, async () => {
    const view = getActiveView()
    if (view?.webContents.navigationHistory.canGoBack()) {
      view.webContents.navigationHistory.goBack()
    }
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_FORWARD, async () => {
    const view = getActiveView()
    if (view?.webContents.navigationHistory.canGoForward()) {
      view.webContents.navigationHistory.goForward()
    }
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_OFFLINE_GET, async () => isOfflineMode())
  ipcMain.handle(IPC_CHANNELS.NAVIGATION_OFFLINE_SET, async (_, offline: boolean) => {
    setOfflineMode(offline)
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_TOOLBAR_RELEASE, async () => {
    const activeProfileId = getActiveProfileId()
    const mainWindow = getMainWindow()
    if (activeProfileId && mainWindow) releaseToolbar(activeProfileId, mainWindow)
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_CERT_INFO, async () => {
    const activeProfileId = getActiveProfileId()
    const mainWindow = getMainWindow()
    if (activeProfileId && mainWindow) await showCertInfo(activeProfileId, mainWindow)
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_CERT_LEAVE, async () => {
    const activeProfileId = getActiveProfileId()
    if (activeProfileId) leaveCertError(activeProfileId)
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_CERT_PROCEED, async () => {
    const activeProfileId = getActiveProfileId()
    if (activeProfileId) proceedCertError(activeProfileId)
  })

  ipcMain.handle(IPC_CHANNELS.NAVIGATION_NAVIGATE, async (_, input: string) => {
    const url = resolveNavigationInput(input)
    if (url) {
      getActiveView()?.webContents.loadURL(url)
    }
  })

  // Tabs: state / activate / close / new operate on the active profile
  ipcMain.handle(IPC_CHANNELS.TABS_GET_STATE, async () => {
    const activeProfileId = getActiveProfileId()
    return activeProfileId ? getTabsState(activeProfileId) : null
  })

  ipcMain.handle(IPC_CHANNELS.TABS_ACTIVATE, async (_, tabId: number) => {
    const activeProfileId = getActiveProfileId()
    const mainWindow = getMainWindow()
    if (activeProfileId && mainWindow) activateTab(activeProfileId, tabId, mainWindow)
  })

  ipcMain.handle(IPC_CHANNELS.TABS_CLOSE, async (_, tabId: number) => {
    const activeProfileId = getActiveProfileId()
    const mainWindow = getMainWindow()
    if (activeProfileId && mainWindow) closeTab(activeProfileId, tabId, mainWindow)
  })

  ipcMain.handle(IPC_CHANNELS.TABS_NEW, async () => {
    const activeProfileId = getActiveProfileId()
    const mainWindow = getMainWindow()
    if (activeProfileId && mainWindow) newTab(activeProfileId, mainWindow)
  })

  // Settings: Modal open (the renderer view already covers the whole window)
  ipcMain.handle(IPC_CHANNELS.SETTINGS_MODAL_OPEN, async () => {
    global.__isSettingsModalOpen = true
    const mainWindow = getMainWindow()
    // Hide all BrowserViews while settings modal is open
    if (mainWindow) {
      hideAllBrowserViews(mainWindow)
    }
  })

  // Settings: Modal close
  ipcMain.handle(IPC_CHANNELS.SETTINGS_MODAL_CLOSE, async () => {
    global.__isSettingsModalOpen = false
    const mainWindow = getMainWindow()
    // Restore active BrowserView
    const activeProfileId = getActiveProfileId()
    if (mainWindow && activeProfileId) {
      showBrowserView(activeProfileId, mainWindow)
    }
  })

  // Settings: Get sidebar collapsed
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_SIDEBAR_COLLAPSED, async () => {
    return getSidebarCollapsed()
  })

  // Settings: Sidebar width
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_SIDEBAR_WIDTH, async () => {
    return getSidebarWidth()
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_SIDEBAR_WIDTH,
    async (_, width: number, persist: boolean) => {
      setExpandedSidebarWidth(width)
      if (persist) setSidebarWidth(width)

      const mainWindow = getMainWindow()
      const activeProfileId = getActiveProfileId()
      if (mainWindow && activeProfileId) {
        updateBrowserViewBounds(activeProfileId, mainWindow)
      }
    }
  )

  // Settings: Set sidebar collapsed
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_SIDEBAR_COLLAPSED, async (_, collapsed: boolean) => {
    setSidebarCollapsed(collapsed)

    const mainWindow = getMainWindow()
    const activeProfileId = getActiveProfileId()
    if (mainWindow && activeProfileId) {
      updateBrowserViewBounds(activeProfileId, mainWindow)
    }
  })

  // Settings: Get launch on startup
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_LAUNCH_ON_STARTUP, async () => {
    return getLaunchOnStartup()
  })

  // Settings: Set launch on startup
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LAUNCH_ON_STARTUP, async (_, enabled: boolean) => {
    setLaunchOnStartup(enabled)
  })

  // Profile: Get data path
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_DATA_PATH, async (_, profileId: string) => {
    return getProfileDataPath(profileId)
  })

  // Icon: Upload custom icon
  ipcMain.handle(IPC_CHANNELS.ICON_UPLOAD, async (_, base64Data: string) => {
    return await saveCustomIcon(base64Data)
  })

  // Icon: Get custom icon path
  ipcMain.handle(IPC_CHANNELS.ICON_GET_PATH, async (_, filename: string) => {
    return getCustomIconPath(filename)
  })

  // Profile: Clear data (cookies, cache, etc.)
  ipcMain.handle(
    IPC_CHANNELS.PROFILE_CLEAR_DATA,
    async (_, profileId: string, options: ClearDataOptions) => {
      await clearProfileData(profileId, options)
    }
  )

  // App version (synchronous)
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion()
  })
}
