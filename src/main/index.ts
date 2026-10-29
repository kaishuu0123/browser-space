import path, { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { is } from '@electron-toolkit/utils'
import { app, autoUpdater, BaseWindow, Menu, shell, WebContentsView } from 'electron'
import icon from '../../resources/icon.png?asset'
import {
  destroyAllBrowserViews,
  handleBrowserShortcut,
  repaintBrowserView,
  updateBrowserViewBounds,
} from './browserViewManager'
import { applyContextMenu } from './contextMenu'
import { isOwnPageUrl, openExternalIfAllowed } from './externalLinks'
import { FindbarWindow } from './findbar/FindbarWindow'
import { setupIpcHandlers } from './ipcHandlers'
import { layoutRendererView } from './layout'
import { getActiveProfileId } from './profileManager'
import { initAutoUpdater } from './updater'

app.setName(app.name)

function sendToRenderer(channel: string): void {
  const rendererView = global.__rendererView as WebContentsView | undefined
  rendererView?.webContents.send(channel)
}

// macOS はメニューを消せずネイティブの About パネルが出るので、
// アプリ内の Settings > About に統一した最小限のアプリメニューを使う
function buildMacMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Browser Space',
        submenu: [
          { label: 'About Browser Space', click: () => sendToRenderer('menu-about') },
          {
            label: 'Check for Updates…',
            click: () => sendToRenderer('menu-check-for-updates'),
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      // macOS routes Cmd+A/C/V/X/Z to text fields through the Edit menu, so without it the
      // address bar and web page inputs ignore them
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
    ])
  )
}

// Remove default menu (avoids BaseWindow compatibility issues)
app.on('ready', () => {
  if (process.platform === 'darwin') {
    buildMacMenu()
  } else {
    Menu.setApplicationMenu(null)
  }
})

// On macOS closing the window only hides it, so the pages keep running and notifications still
// arrive; this is set once the app is really quitting (Cmd+Q, update install, shutdown)
let isQuitting = false
app.on('before-quit', () => {
  isQuitting = true
})
if (process.platform === 'darwin') {
  autoUpdater.on('before-quit-for-update', () => {
    isQuitting = true
  })
}

function showMainWindow(mainWindow: BaseWindow): void {
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createWindow(): void {
  // Position, size and maximized state are persisted and restored by Electron itself,
  // which also keeps the window on a connected display when monitors change.
  const mainWindow = new BaseWindow({
    name: 'main-window',
    windowStatePersistence: true,
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process?.platform === 'linux' ? { icon } : {}),
  })

  mainWindow.setIcon(path.join(__dirname, '../../resources/icon.png'))

  const rendererView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  rendererView.setBackgroundColor('#00000000')
  applyContextMenu(rendererView)

  mainWindow.contentView.addChildView(rendererView)

  rendererView.webContents.on('did-finish-load', () => {
    layoutRendererView(mainWindow, rendererView)
    mainWindow.show()
  })

  // F12: DevTools (renderer view)
  rendererView.webContents.on('before-input-event', (event, input) => {
    if (handleBrowserShortcut(input)) {
      event.preventDefault()
      return
    }
    if (input.key === 'F12' && input.type === 'keyDown') {
      event.preventDefault()
      if (rendererView.webContents.isDevToolsOpened()) {
        rendererView.webContents.closeDevTools()
      } else {
        rendererView.webContents.openDevTools()
      }
    }
  })

  const updateLayout = () => {
    const isSettingsModalOpen = global.__isSettingsModalOpen ?? false

    // rendererView は常に全画面（BrowserView の背面）
    layoutRendererView(mainWindow, rendererView)

    // Settings Modal開いていない場合のみBrowserViewを更新
    if (!isSettingsModalOpen) {
      const activeProfileId = getActiveProfileId()
      if (activeProfileId) {
        updateBrowserViewBounds(activeProfileId, mainWindow)
        setTimeout(() => {
          if (getActiveProfileId() === activeProfileId) {
            updateBrowserViewBounds(activeProfileId, mainWindow)
          }
        }, 100)
      }
    }
    rendererView.webContents.send('window-resized')
  }

  mainWindow.on('resize', updateLayout)
  mainWindow.on('resized', updateLayout)
  mainWindow.on('will-resize', updateLayout)
  mainWindow.on('move', updateLayout)
  mainWindow.on('maximize', updateLayout)
  mainWindow.on('unmaximize', updateLayout)
  mainWindow.on('enter-full-screen', updateLayout)
  mainWindow.on('leave-full-screen', updateLayout)

  // Re-apply bounds and force a repaint. Without this the content area can stay blank
  // (only the sidebar visible) after the window was inactive, until a sidebar item is clicked.
  const refreshViews = () => {
    updateLayout()
    if (!(global.__isSettingsModalOpen ?? false)) {
      repaintBrowserView(getActiveProfileId())
    }
    rendererView.webContents.invalidate()
  }

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
  mainWindow.on('closed', destroyAllBrowserViews)

  mainWindow.on('restore', refreshViews)
  mainWindow.on('show', refreshViews)
  mainWindow.on('focus', refreshViews)

  // Links in the app's own screens (About, update notes) open in the system browser, web pages
  // only; mail and phone links go to the system as well
  rendererView.webContents.setWindowOpenHandler((details) => {
    try {
      const { protocol } = new URL(details.url)
      if (protocol === 'https:' || protocol === 'http:') shell.openExternal(details.url)
      else openExternalIfAllowed(details.url)
    } catch (_e) {
      // Not a URL: nothing to open
    }
    return { action: 'deny' }
  })

  // This view holds the bridge to the main process, so it never leaves the app's own page
  // (reloads and the dev server's hot updates stay on it)
  const ownUrl =
    is.dev && process.env.ELECTRON_RENDERER_URL
      ? process.env.ELECTRON_RENDERER_URL
      : pathToFileURL(join(__dirname, '../renderer/index.html')).href
  rendererView.webContents.on('will-navigate', (event, url) => {
    if (!isOwnPageUrl(url, ownUrl)) event.preventDefault()
  })
  rendererView.webContents.on('will-redirect', (event, url) => {
    if (!isOwnPageUrl(url, ownUrl)) event.preventDefault()
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    rendererView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    rendererView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }

  global.__mainWindow = mainWindow
  global.__rendererView = rendererView
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = global.__mainWindow as BaseWindow | undefined
    if (mainWindow) showMainWindow(mainWindow)
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(app.name)

    setupIpcHandlers()
    FindbarWindow.setupIpc()
    createWindow()

    initAutoUpdater(() => (global.__rendererView as WebContentsView | undefined)?.webContents)

    app.on('activate', () => {
      const mainWindow = global.__mainWindow as BaseWindow | undefined
      if (mainWindow && !mainWindow.isDestroyed()) {
        showMainWindow(mainWindow)
      } else if (BaseWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
