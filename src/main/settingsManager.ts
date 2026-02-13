import { app } from 'electron'
import Store from 'electron-store'

interface Settings {
  sidebarCollapsed: boolean
  launchOnStartup: boolean
}

const store = new Store<Settings>({
  defaults: {
    sidebarCollapsed: false,
    launchOnStartup: false,
  },
  name: 'settings',
})

// Sidebar collapsed
export function getSidebarCollapsed(): boolean {
  return store.get('sidebarCollapsed', false)
}

export function setSidebarCollapsed(collapsed: boolean): void {
  store.set('sidebarCollapsed', collapsed)
}

// Launch on startup
export function getLaunchOnStartup(): boolean {
  // OSの実際の設定を確認
  const loginItemSettings = app.getLoginItemSettings()
  return loginItemSettings.openAtLogin
}

export function setLaunchOnStartup(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false, // macOSでバックグラウンド起動しない
  })
  store.set('launchOnStartup', enabled)
}

// 初期化時にstoreの値でOSの設定を同期
export function initializeLaunchOnStartup(): void {
  const storedValue = store.get('launchOnStartup', false)
  const currentValue = getLaunchOnStartup()

  // storeとOSの設定が不一致なら同期
  if (storedValue !== currentValue) {
    setLaunchOnStartup(storedValue)
  }
}
