import { ElectronAPI } from '@electron-toolkit/preload'
import { IconAPI, NavigationAPI, ProfileAPI, SearchAPI, SettingsAPI, TabsAPI } from '../shared/ipc'
import { UpdateState } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    profileApi: ProfileAPI
    navigationApi: NavigationAPI
    tabsApi: TabsAPI
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
