import { ElectronAPI } from '@electron-toolkit/preload'
import { ProfileAPI, SettingsAPI, IconAPI, SearchAPI } from '../shared/ipc'

declare global {
  interface Window {
    electron: ElectronAPI
    profileApi: ProfileAPI
    settingsApi: SettingsAPI
    iconApi: IconAPI
    searchApi: SearchAPI
  }
}
