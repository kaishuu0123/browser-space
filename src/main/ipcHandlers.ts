import { ipcMain, BaseWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  reorderProfiles,
  getActiveProfileId,
  setActiveProfileId,
  getSidebarCollapsed,
  setSidebarCollapsed,
  getProfileDataPath,
} from './profileManager'
import {
  showBrowserView,
  removeBrowserView,
  updateBrowserViewBounds,
  recreateBrowserView,
  hideAllBrowserViews,
  getBrowserView,
} from './browserViewManager'
import { saveCustomIcon, getCustomIconPath } from './iconManager'
import { clearProfileData, ClearDataOptions } from './dataCleaner'

const SIDEBAR_WIDTH_EXPANDED = 256 // w-64 in Tailwind
const SIDEBAR_WIDTH_COLLAPSED = 64 // w-16 in Tailwind

function getSidebarWidth(): number {
  const collapsed = getSidebarCollapsed()
  return collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
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

    // If language changed and this is the active profile, recreate BrowserView
    if (updated && oldProfile && oldProfile.language !== updated.language) {
      const activeProfileId = getActiveProfileId()
      if (activeProfileId === id) {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          recreateBrowserView(id, mainWindow, getSidebarWidth())
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
      showBrowserView(id, mainWindow, getSidebarWidth())
    } else {
      hideAllBrowserViews(mainWindow)
    }
  })

  // Profile: Reload active profile
  ipcMain.handle(IPC_CHANNELS.PROFILE_RELOAD, async () => {
    const activeProfileId = getActiveProfileId()
    if (!activeProfileId) return
    const view = getBrowserView(activeProfileId)
    view?.webContents.reload()
  })

  // Settings: Modal open (expand rendererView to full window)
  ipcMain.handle(IPC_CHANNELS.SETTINGS_MODAL_OPEN, async () => {
    const mainWindow = getMainWindow()
    const rendererView = global.__rendererView
    if (rendererView && mainWindow) {
      const bounds = mainWindow.getContentBounds()
      rendererView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
    }
  })

  // Settings: Modal close (shrink rendererView back to sidebar width)
  ipcMain.handle(IPC_CHANNELS.SETTINGS_MODAL_CLOSE, async () => {
    const mainWindow = getMainWindow()
    const rendererView = global.__rendererView
    if (rendererView && mainWindow) {
      const bounds = mainWindow.getContentBounds()
      rendererView.setBounds({ x: 0, y: 0, width: getSidebarWidth(), height: bounds.height })
    }
  })

  // Settings: Get sidebar collapsed
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_SIDEBAR_COLLAPSED, async () => {
    return getSidebarCollapsed()
  })

  // Settings: Set sidebar collapsed
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_SIDEBAR_COLLAPSED, async (_, collapsed: boolean) => {
    setSidebarCollapsed(collapsed)

    const mainWindow = getMainWindow()
    const activeProfileId = getActiveProfileId()
    if (mainWindow && activeProfileId) {
      updateBrowserViewBounds(activeProfileId, mainWindow, getSidebarWidth())
    }

    // Update rendererView to match new sidebar width
    const rendererView = global.__rendererView
    if (rendererView && mainWindow) {
      const bounds = mainWindow.getContentBounds()
      rendererView.setBounds({ x: 0, y: 0, width: getSidebarWidth(), height: bounds.height })
    }
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
}
