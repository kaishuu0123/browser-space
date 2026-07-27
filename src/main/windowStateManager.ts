import { BaseWindow, screen } from 'electron'
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
  if (window && !window.isDestroyed() && !window.isMinimized()) {
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
}

export function applyWindowState(window: BaseWindow): void {
  const state = getWindowState()
  const savedWidth = state.width ?? 1200
  const savedHeight = state.height ?? 800
  let savedX = state.x
  let savedY = state.y

  // 保存されている座標が現在接続されているディスプレイの有効領域内にあるか判定
  if (savedX != null && savedY != null) {
    const displays = screen.getAllDisplays()
    const isVisible = displays.some((display) => {
      const { x, y, width, height } = display.workArea
      return (
        savedX! + savedWidth > x &&
        savedX! < x + width &&
        savedY! + savedHeight > y &&
        savedY! < y + height
      )
    })
    // 画面外に飛んでいる場合は座標をリセット
    if (!isVisible) {
      savedX = undefined
      savedY = undefined
    }
  }

  window.setSize(savedWidth, savedHeight)

  if (savedX != null && savedY != null) {
    window.setPosition(savedX, savedY)
  } else {
    window.center()
  }

  if (state.isMaximized) {
    window.maximize()
  }
}

export function trackWindowState(window: BaseWindow): void {
  let saveTimeout: NodeJS.Timeout | null = null

  const scheduleSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveWindowState(window)
    }, 500)
  }

  window.on('resize', scheduleSave)
  window.on('move', scheduleSave)
  window.on('maximize', () => saveWindowState(window))
  window.on('unmaximize', () => saveWindowState(window))

  window.on('close', () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveWindowState(window)
  })

  // アプリ起動中に外部ディスプレイが切断された場合のリアルタイム画面外防止ケア
  screen.on('display-removed', () => {
    if (window && !window.isDestroyed()) {
      const bounds = window.getBounds()
      const displays = screen.getAllDisplays()

      const isVisible = displays.some((display) => {
        const { x, y, width, height } = display.workArea
        return (
          bounds.x + bounds.width > x &&
          bounds.x < x + width &&
          bounds.y + bounds.height > y &&
          bounds.y < y + height
        )
      })

      // 画面外に出てしまっている場合は画面中央へ復元
      if (!isVisible) {
        window.center()
      }
    }
  })
}
