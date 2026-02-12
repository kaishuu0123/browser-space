import Store from 'electron-store'
import { AppSettings, defaultSettings } from '../shared/types'

// Create store with type safety
const store = new Store<AppSettings>({
  defaults: defaultSettings,
  name: 'settings',
  migrations: {}
})

export default store
