import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { app, shell, BaseWindow, WebContentsView, Menu } from 'electron'
import path, { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipcHandlers'
import { updateBrowserViewBounds, repaintBrowserView } from './browserViewManager'
import { getActiveProfileId, getSidebarCollapsed } from './profileManager'
import { FindbarWindow } from './findbar/FindbarWindow'
import { applyWindowState, trackWindowState } from './windowStateManager'
import { applyContextMenu } from './contextMenu'
import icon from '../../resources/icon.png?asset'

app.setName('Browser Space')

export function initAutoUpdater(rendererView: WebContentsView): void {
  // 開発環境では動かさない
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    rendererView.webContents.send('update-checking')
  })

  autoUpdater.on('update-available', (info) => {
    rendererView.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    rendererView.webContents.send('update-not-available')
  })

  autoUpdater.on('update-downloaded', (info) => {
    rendererView.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err)
    rendererView.webContents.send('update-error', err.message)
  })

  autoUpdater.checkForUpdates()
}

// Remove default menu (avoids BaseWindow compatibility issues)
app.on('ready', () => {
  Menu.setApplicationMenu(null)
})

function createWindow(): void {
  const mainWindow = new BaseWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process?.platform === 'linux' ? { icon } : {}),
  })

  mainWindow.setIcon(path.join(__dirname, '../../resources/icon.png'))

  // ウィンドウの位置・サイズを復元
  applyWindowState(mainWindow)

  // ウィンドウの状態変更を追跡して自動保存
  trackWindowState(mainWindow)

  const rendererView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  rendererView.setBackgroundColor('#00000000')
  applyContextMenu(rendererView)

  mainWindow.contentView.addChildView(rendererView)

  const getSidebarWidth = () => (getSidebarCollapsed() ? 64 : 256)

  const updateRendererBounds = () => {
    const bounds = mainWindow.getContentBounds()
    // rendererView covers only the sidebar area
    rendererView.setBounds({ x: 0, y: 0, width: getSidebarWidth(), height: bounds.height })
  }

  rendererView.webContents.on('did-finish-load', () => {
    updateRendererBounds()
    mainWindow.show()
  })

  // F12: DevTools (renderer view)
  rendererView.webContents.on('before-input-event', (event, input) => {
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
    const bounds = mainWindow.getContentBounds()
    const sidebarWidth = getSidebarWidth()

    // rendererView のサイズ調整（Settings Modal開いていたら全画面）
    rendererView.setBounds({
      x: 0,
      y: 0,
      width: isSettingsModalOpen ? bounds.width : sidebarWidth,
      height: bounds.height,
    })

    // Settings Modal開いていない場合のみBrowserViewを更新
    if (!isSettingsModalOpen) {
      const activeProfileId = getActiveProfileId()
      if (activeProfileId) {
        updateBrowserViewBounds(activeProfileId, mainWindow, sidebarWidth)
        setTimeout(() => {
          if (getActiveProfileId() === activeProfileId) {
            updateBrowserViewBounds(activeProfileId, mainWindow, sidebarWidth)
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

  mainWindow.on('restore', () => {
    updateRendererBounds()
    const activeProfileId = getActiveProfileId()
    if (activeProfileId) {
      updateBrowserViewBounds(activeProfileId, mainWindow, getSidebarWidth())
      repaintBrowserView(activeProfileId)
    }
    rendererView.webContents.invalidate()
    rendererView.webContents.send('window-resized')
  })

  rendererView.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    rendererView.webContents.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    rendererView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }

  global.__mainWindow = mainWindow
  global.__rendererView = rendererView
}

app.whenReady().then(() => {
  app.setAppUserModelId('Browser Space')

  setupIpcHandlers()
  FindbarWindow.setupIpc()
  createWindow()

  initAutoUpdater(global.__rendererView as WebContentsView)

  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
