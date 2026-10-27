import { ElectronAPI } from '@electron-toolkit/preload'
import { IconAPI, ProfileAPI, SearchAPI, SettingsAPI } from '../shared/ipc'
import { UpdateState } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    profileApi: ProfileAPI
    settingsApi: SettingsAPI
    iconApi: IconAPI
    searchApi: SearchAPI
    updaterApi: {
      installUpdate: () => void
      getAppVersion: () => string
      getUpdateState: () => Promise<UpdateState>
      checkForUpdates: () => void
    }
  }
}
