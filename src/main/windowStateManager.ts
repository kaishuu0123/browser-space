import { BaseWindow } from 'electron'
import Store from 'electron-store'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const store = new Store<{ windowState: WindowState }>({
  defaults: {
    windowState: {
      width: 1200,
      height: 800,
      isMaximized: false,
    },
  },
  name: 'window-state',
})

export function getWindowState(): WindowState {
  return store.get('windowState')
}

export function saveWindowState(window: BaseWindow): void {
  const bounds = window.getBounds()
  const isMaximized = window.isMaximized()

  store.set('windowState', {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized,
  })
}

export function applyWindowState(window: BaseWindow): void {
  const state = getWindowState()

  // サイズを設定
  window.setBounds({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
  })

  // 位置が保存されていない場合（初回起動時）は中央表示
  if (state.x === undefined || state.y === undefined) {
    window.center()
  }

  // 最大化状態を復元
  if (state.isMaximized) {
    window.maximize()
  }
}

export function trackWindowState(window: BaseWindow): void {
  // リサイズやmove時に保存（デバウンス処理）
  let saveTimeout: NodeJS.Timeout | null = null

  const scheduleSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveWindowState(window)
    }, 500) // 500ms後に保存
  }

  window.on('resize', scheduleSave)
  window.on('move', scheduleSave)
  window.on('maximize', () => saveWindowState(window))
  window.on('unmaximize', () => saveWindowState(window))

  // アプリ終了時に保存
  window.on('close', () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveWindowState(window)
  })
}
