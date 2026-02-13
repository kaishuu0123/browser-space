import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS, ProfileAPI, SettingsAPI, IconAPI } from '../shared/ipc'
import { Profile } from '../shared/types'

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
}

// Settings API
const settingsApi: SettingsAPI = {
  getSidebarCollapsed: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_SIDEBAR_COLLAPSED),
  setSidebarCollapsed: (collapsed: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_SIDEBAR_COLLAPSED, collapsed),
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

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('profileApi', profileApi)
    contextBridge.exposeInMainWorld('settingsApi', settingsApi)
    contextBridge.exposeInMainWorld('iconApi', iconApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.profileApi = profileApi
  // @ts-expect-error (define in dts)
  window.settingsApi = settingsApi
  // @ts-expect-error (define in dts)
  window.iconApi = iconApi
}
