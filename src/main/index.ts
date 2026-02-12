import { app, shell, BaseWindow, WebContentsView, Menu } from 'electron'
import path, { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipcHandlers'
import { updateBrowserViewBounds, repaintBrowserView } from './browserViewManager'
import { getActiveProfileId, getSidebarCollapsed } from './profileManager'
import { FindbarWindow } from './findbar/FindbarWindow'
import icon from '../../resources/icon.png?asset'

app.setName('Browser Space')

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

  const rendererView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  rendererView.setBackgroundColor('#00000000')

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
    updateRendererBounds()
    const activeProfileId = getActiveProfileId()
    if (activeProfileId) {
      updateBrowserViewBounds(activeProfileId, mainWindow, getSidebarWidth())
      setTimeout(() => {
        if (getActiveProfileId() === activeProfileId) {
          updateBrowserViewBounds(activeProfileId, mainWindow, getSidebarWidth())
        }
      }, 100)
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
  app.setAppUserModelId('me.saino.browser-space')

  setupIpcHandlers()
  FindbarWindow.setupIpc()
  createWindow()
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
