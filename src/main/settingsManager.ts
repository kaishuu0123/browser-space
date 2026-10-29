import { app } from 'electron'
import Store from 'electron-store'
import { clampSidebarWidth, SIDEBAR_WIDTH_DEFAULT } from '../shared/layout'

interface Settings {
  sidebarCollapsed: boolean
  sidebarWidth: number
  launchOnStartup: boolean
}

const store = new Store<Settings>({
  defaults: {
    sidebarCollapsed: false,
    sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
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

// Sidebar width (expanded)
export function getSidebarWidth(): number {
  return clampSidebarWidth(store.get('sidebarWidth', SIDEBAR_WIDTH_DEFAULT))
}

export function setSidebarWidth(width: number): void {
  store.set('sidebarWidth', clampSidebarWidth(width))
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
