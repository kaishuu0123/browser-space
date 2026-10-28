import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import {
  type IconAPI,
  IPC_CHANNELS,
  type NavigationAPI,
  type ProfileAPI,
  type SettingsAPI,
  type TabsAPI,
} from '../shared/ipc'
import type { NavigationState, Profile, TabsState, UpdateState } from '../shared/types'

// Profile API
const profileApi: ProfileAPI = {
  getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_ALL),
  getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_BY_ID, id),
  create: (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'order'>) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CREATE, data),
  update: (id: string, data: Partial<Profile>) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, id, data),
  delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, id),
  reorder: (orderedIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_REORDER, orderedIds),
  getActive: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_ACTIVE),
  setActive: (id: string | null) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SET_ACTIVE, id),
  switch: (id: string | null) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SWITCH, id),
  reload: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_RELOAD),
  getDataPath: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_DATA_PATH, profileId),
  clearData: (
    profileId: string,
    options: {
      cookies?: boolean
      cache?: boolean
      appData?: boolean
    }
  ) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CLEAR_DATA, profileId, options),
  onViewCrashed: (callback: (profileId: string) => void) => {
    const subscription = (_event: unknown, profileId: string) => callback(profileId)
    ipcRenderer.on(IPC_CHANNELS.PROFILE_VIEW_CRASHED, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_VIEW_CRASHED, subscription)
    }
  },
  onActivated: (callback: (profileId: string) => void) => {
    const subscription = (_event: unknown, profileId: string) => callback(profileId)
    ipcRenderer.on(IPC_CHANNELS.PROFILE_ACTIVATED, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_ACTIVATED, subscription)
    }
  },
}

// Navigation API
const navigationApi: NavigationAPI = {
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.NAVIGATION_GET_STATE),
  goBack: () => ipcRenderer.invoke(IPC_CHANNELS.NAVIGATION_BACK),
  goForward: () => ipcRenderer.invoke(IPC_CHANNELS.NAVIGATION_FORWARD),
  navigate: (input: string) => ipcRenderer.invoke(IPC_CHANNELS.NAVIGATION_NAVIGATE, input),
  onState: (callback: (state: NavigationState | null) => void) => {
    const subscription = (_event: unknown, state: NavigationState | null) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.NAVIGATION_STATE, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATION_STATE, subscription)
    }
  },
  onFocusUrl: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(IPC_CHANNELS.NAVIGATION_FOCUS_URL, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATION_FOCUS_URL, subscription)
    }
  },
}

// Tabs API
const tabsApi: TabsAPI = {
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_STATE),
  activate: (tabId: number) => ipcRenderer.invoke(IPC_CHANNELS.TABS_ACTIVATE, tabId),
  close: (tabId: number) => ipcRenderer.invoke(IPC_CHANNELS.TABS_CLOSE, tabId),
  create: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_NEW),
  onState: (callback: (state: TabsState | null) => void) => {
    const subscription = (_event: unknown, state: TabsState | null) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.TABS_STATE, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TABS_STATE, subscription)
    }
  },
}

// Settings API
const settingsApi: SettingsAPI = {
  getSidebarCollapsed: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_SIDEBAR_COLLAPSED),
  setSidebarCollapsed: (collapsed: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_SIDEBAR_COLLAPSED, collapsed),
  getSidebarWidth: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_SIDEBAR_WIDTH),
  setSidebarWidth: (width: number, persist: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_SIDEBAR_WIDTH, width, persist),
  notifyModalOpen: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_MODAL_OPEN),
  notifyModalClose: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_MODAL_CLOSE),
  getLaunchOnStartup: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LAUNCH_ON_STARTUP),
  setLaunchOnStartup: (enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LAUNCH_ON_STARTUP, enabled),
}

// Icon API
const iconApi: IconAPI = {
  upload: (base64Data: string) => ipcRenderer.invoke(IPC_CHANNELS.ICON_UPLOAD, base64Data),
  getPath: (filename: string) => ipcRenderer.invoke(IPC_CHANNELS.ICON_GET_PATH, filename),
}

// Updater API
const updaterApi = {
  installUpdate: (): void => {
    ipcRenderer.send('install-update')
  },
  getAppVersion: (): string => {
    return ipcRenderer.sendSync('get-app-version')
  },
  getUpdateState: (): Promise<UpdateState> => {
    return ipcRenderer.invoke('get-update-state')
  },
  checkForUpdates: (): void => {
    ipcRenderer.send('check-for-updates-now')
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('profileApi', profileApi)
    contextBridge.exposeInMainWorld('navigationApi', navigationApi)
    contextBridge.exposeInMainWorld('tabsApi', tabsApi)
    contextBridge.exposeInMainWorld('settingsApi', settingsApi)
    contextBridge.exposeInMainWorld('iconApi', iconApi)
    contextBridge.exposeInMainWorld('updaterApi', updaterApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.profileApi = profileApi
  // @ts-expect-error (define in dts)
  window.navigationApi = navigationApi
  // @ts-expect-error (define in dts)
  window.tabsApi = tabsApi
  // @ts-expect-error (define in dts)
  window.settingsApi = settingsApi
  // @ts-expect-error (define in dts)
  window.iconApi = iconApi
  // @ts-expect-error (define in dts)
  window.updaterApi = updaterApi
}
