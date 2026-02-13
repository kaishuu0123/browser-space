import { WebContentsView, BaseWindow, session, app, shell } from 'electron'
import { getProfileById } from './profileManager'
import { showNotificationPermissionDialog } from './notificationManager'
import { FindbarWindow } from './findbar/FindbarWindow'

// Map to store WebContentsViews by profile ID
const browserViews = new Map<string, WebContentsView>()

// Get system locale (e.g., 'en-US', 'ja-JP')
function getSystemLocale(): string {
  return app.getLocale()
}

// Get or create WebContentsView for a profile
export function getOrCreateBrowserView(profileId: string, mainWindow: BaseWindow): WebContentsView {
  // Check if WebContentsView already exists
  if (browserViews.has(profileId)) {
    return browserViews.get(profileId)!
  }

  // Get profile data
  const profile = getProfileById(profileId)
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`)
  }

  // Determine language to use (profile language or system default)
  const language = profile.language || getSystemLocale()

  // Create session with partition (for session isolation)
  const partitionName = `persist:profile-${profileId}`
  const profileSession = session.fromPartition(partitionName)

  // Set Accept-Language header
  profileSession.setUserAgent(profileSession.getUserAgent(), language)

  // Setup permission request handler for notifications
  profileSession.setPermissionRequestHandler(async (webContents, permission, callback) => {
    if (permission === 'notifications') {
      const url = webContents.getURL()
      let domain = ''

      try {
        const urlObj = new URL(url)
        domain = urlObj.hostname
      } catch (_e) {
        console.error('Failed to parse URL:', url)
        callback(false)
        return
      }

      const granted = await showNotificationPermissionDialog(mainWindow, {
        profileId,
        domain,
        url,
      })

      callback(granted)
    } else {
      callback(false)
    }
  })

  // Create WebContentsView
  const view = new WebContentsView({
    webPreferences: {
      session: profileSession,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Intercept notifications to add profile name
  view.webContents.on('did-finish-load', () => {
    view.webContents
      .executeJavaScript(
        `
      (function() {
        const OriginalNotification = window.Notification;
        const profileName = ${JSON.stringify(profile.name)};

        window.Notification = function(title, options) {
          const newTitle = '[' + profileName + '] ' + title;
          return new OriginalNotification(newTitle, options);
        };

        window.Notification.permission = OriginalNotification.permission;
        window.Notification.requestPermission = OriginalNotification.requestPermission.bind(OriginalNotification);
        window.Notification.prototype = OriginalNotification.prototype;
      })();
    `
      )
      .catch((err) => {
        console.error('Failed to inject notification interceptor:', err)
      })
  })

  // Setup findbar
  const findbar = FindbarWindow.from(mainWindow, view.webContents)

  // Ctrl+F / Cmd+F → open findbar
  view.webContents.on('before-input-event', (event, input) => {
    if (
      (input.control || input.meta) &&
      input.key.toLowerCase() === 'f' &&
      input.type === 'keyDown'
    ) {
      event.preventDefault()
      findbar.open()
    }
  })

  // Set Accept-Language header via webRequest
  profileSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Accept-Language'] = language
    callback({ requestHeaders: details.requestHeaders })
  })

  view.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the home URL
  view.webContents.loadURL(profile.homeUrl)

  // Store the view
  browserViews.set(profileId, view)

  return view
}

// Get WebContentsView for a profile
export function getBrowserView(profileId: string): WebContentsView | undefined {
  return browserViews.get(profileId)
}

// Show WebContentsView for active profile
export function showBrowserView(
  profileId: string,
  mainWindow: BaseWindow,
  sidebarWidth: number
): void {
  // Hide all views first
  hideAllBrowserViews(mainWindow)

  // Get or create the view
  const view = getOrCreateBrowserView(profileId, mainWindow)

  // Add profileView to window
  const contentView = mainWindow.contentView
  if (!contentView.children.includes(view)) {
    contentView.addChildView(view)
  }

  // Calculate bounds (account for sidebar)
  const bounds = mainWindow.getContentBounds()
  view.setBounds({
    x: sidebarWidth,
    y: 0,
    width: bounds.width - sidebarWidth,
    height: bounds.height,
  })
}

// Hide all WebContentsViews
export function hideAllBrowserViews(mainWindow: BaseWindow): void {
  const contentView = mainWindow.contentView
  browserViews.forEach((view) => {
    if (contentView.children.includes(view)) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  })
}

// Remove WebContentsView for a profile (when profile is deleted)
export function removeBrowserView(profileId: string, mainWindow: BaseWindow): void {
  const view = browserViews.get(profileId)
  if (view) {
    // Destroy findbar if exists
    FindbarWindow.destroyForContents(view.webContents)

    const contentView = mainWindow.contentView
    if (contentView.children.includes(view)) {
      contentView.removeChildView(view)
    }
    view.webContents.close()
    browserViews.delete(profileId)
  }
}

// Recreate WebContentsView (e.g., when language settings change)
export function recreateBrowserView(
  profileId: string,
  mainWindow: BaseWindow,
  sidebarWidth: number
): void {
  removeBrowserView(profileId, mainWindow)
  showBrowserView(profileId, mainWindow, sidebarWidth)
}

// Update bounds when window is resized
export function updateBrowserViewBounds(
  activeProfileId: string | null,
  mainWindow: BaseWindow,
  sidebarWidth: number
): void {
  if (!activeProfileId) return

  const view = browserViews.get(activeProfileId)
  if (!view) return

  const bounds = mainWindow.getContentBounds()
  view.setBounds({
    x: sidebarWidth,
    y: 0,
    width: bounds.width - sidebarWidth,
    height: bounds.height,
  })
}

// Force repaint WebContentsView
export function repaintBrowserView(activeProfileId: string | null): void {
  if (!activeProfileId) return

  const view = browserViews.get(activeProfileId)
  if (!view) return

  view.webContents.invalidate()
}
