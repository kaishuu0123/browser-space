import { createHash } from 'node:crypto'
import { connect } from 'node:tls'
import {
  app,
  type BaseWindow,
  type Input,
  type Session,
  session,
  type WebContents,
  WebContentsView,
} from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { ChromeState } from '../shared/layout'
import type {
  CertDetails,
  CertErrorInfo,
  LoadErrorInfo,
  NavigationState,
  Profile,
  TabsState,
} from '../shared/types'
import { showCertWindow } from './certWindow'
import { applyContextMenu } from './contextMenu'
import { isAllowedExternalUrl, openExternalIfAllowed } from './externalLinks'
import { FindbarWindow } from './findbar/FindbarWindow'
import { getContentViewBounds, setCurrentChrome } from './layout'
import { showNotificationPermissionDialog } from './notificationManager'
import { getActiveProfileId, getProfileById, setActiveProfileId } from './profileManager'

interface Tab {
  id: number
  view: WebContentsView
  // Render process gone (or hung): the view is hidden and the tab bar offers a reload
  crashed: boolean
  // Tab this one was opened from (new tabs are grouped to the right of their opener)
  openerId?: number
  favicon?: string
  // Set while the page is blocked by a certificate error: the view is hidden and the renderer
  // shows the error screen
  certError?: CertErrorInfo
  // The page loaded because the user trusted its invalid certificate
  certBypassed?: boolean
  // Set while the page could not be reached: the view is hidden and the renderer shows an
  // error screen (with a game while offline)
  loadError?: LoadErrorInfo
}

// The tab's view stays hidden while the renderer shows a screen of its own in its place
function isBlocked(tab: Tab): boolean {
  return tab.crashed || !!tab.certError || !!tab.loadError
}

// Certificates the user chose to trust despite an error, per profile. Kept in memory only, so
// the exception ends when the app quits. Like Chrome's, it is tied to the host AND the
// certificate: a different certificate on the same host raises the error again.
const trustedCerts = new Map<string, Set<string>>()

function trustKey(hostname: string, fingerprint: string): string {
  return `${hostname}|${fingerprint}`
}

// Certificate of the last failed check per profile and host:port, for the error screen
const certFailures = new Map<string, Map<string, CertDetails>>()

// Certificate of the last successful check per profile and host, for the lock's panel
const validCerts = new Map<string, Map<string, CertDetails>>()

// Which profile a session belongs to (certificate errors are reported per session)
const sessionProfileIds = new WeakMap<Session, string>()

// Certificate errors: a host the user trusted in this profile is let through; for any other the
// certificate is remembered (for the error screen) and the page is blocked. Chromium asks again
// on every attempt, so trusting a host takes effect on the next load.
app.on('certificate-error', (event, webContents, url, _error, certificate, callback) => {
  event.preventDefault()

  const profileId = webContents ? sessionProfileIds.get(webContents.session) : undefined
  let hostname = ''
  let host = ''
  try {
    ;({ hostname, host } = new URL(url))
  } catch (_e) {
    callback(false)
    return
  }
  if (!profileId) {
    callback(false)
    return
  }
  if (trustedCerts.get(profileId)?.has(trustKey(hostname, certificate.fingerprint))) {
    // Remember on the tab that this page is only here by exception (the address bar warns)
    const tab = profileTabs.get(profileId)?.tabs.find((t) => t.view.webContents === webContents)
    if (tab && !tab.certBypassed) {
      tab.certBypassed = true
      if (getActiveProfileId() === profileId) sendTabsState(profileId)
    }
    callback(true)
    return
  }

  let failures = certFailures.get(profileId)
  if (!failures) {
    failures = new Map()
    certFailures.set(profileId, failures)
  }
  failures.set(host, {
    subject: certificate.subjectName,
    issuer: certificate.issuerName,
    validFrom: certificate.validStart,
    validTo: certificate.validExpiry,
    fingerprint: certificate.fingerprint,
  })
  callback(false)
})

// Chromium's certificate errors are -200 to -299 (ERR_CERT_AUTHORITY_INVALID is -202, ...)
function isCertErrorCode(errorCode: number): boolean {
  return errorCode <= -200 && errorCode > -300
}

const ERR_INTERNET_DISCONNECTED = -106

// Network errors worth an error screen: -100 to -199 are connection errors (refused, reset, timed
// out, DNS failure, no internet...), plus a few others. -3 (aborted) is a navigation that was
// replaced by another one, not a failure.
function isNetworkErrorCode(errorCode: number): boolean {
  return (errorCode <= -100 && errorCode > -200) || errorCode === -7 || errorCode === -21
}

const HIDDEN_BOUNDS = { x: 0, y: 0, width: 0, height: 0 }

interface ProfileTabs {
  tabs: Tab[]
  activeTabId: number
}

// Tabs of each profile, keyed by profile ID. All tabs of a profile share one session.
const profileTabs = new Map<string, ProfileTabs>()

// Profiles whose session handlers are already set up
const initializedSessions = new Set<string>()

// "Work offline": web requests of every profile are refused, as if the network were gone (the
// real connection is left alone), so the offline screen can be tried at will. Not remembered
// across restarts.
let offlineMode = false

export function isOfflineMode(): boolean {
  return offlineMode
}

// Chromium reports a request cancelled by the app as ERR_BLOCKED_BY_CLIENT
const ERR_BLOCKED_BY_CLIENT = -20

export function setOfflineMode(offline: boolean): void {
  if (offline === offlineMode) return
  offlineMode = offline

  // Back online: the pages that failed meanwhile load again (the system never went offline, so
  // the renderer gets no 'online' event for it)
  if (!offline) {
    for (const { tabs } of profileTabs.values()) {
      for (const tab of tabs) {
        if (tab.loadError && isAlive(tab.view)) tab.view.webContents.reload()
      }
    }
  }
  ;(global.__rendererView as WebContentsView | undefined)?.webContents.send(
    IPC_CHANNELS.NAVIGATION_OFFLINE_CHANGED,
    offline
  )
}

let nextTabId = 1

// Get system locale (e.g., 'en-US', 'ja-JP')
function getSystemLocale(): string {
  return app.getLocale()
}

function getActiveTab(profileId: string): Tab | undefined {
  const entry = profileTabs.get(profileId)
  return entry?.tabs.find((tab) => tab.id === entry.activeTabId)
}

// A page that closed itself (window.close()) is destroyed together with its contents, and the
// view's webContents is then undefined
function isAlive(view: WebContentsView): boolean {
  const contents = view.webContents as WebContents | undefined
  return !!contents && !contents.isDestroyed()
}

// Navigation state of the active tab of a profile (null if it has no live tab)
export function getNavigationState(profileId: string): NavigationState | null {
  const view = getActiveTab(profileId)?.view
  if (!view || !isAlive(view)) return null

  const { webContents } = view
  return {
    profileId,
    url: webContents.getURL(),
    title: webContents.getTitle(),
    canGoBack: webContents.navigationHistory.canGoBack(),
    canGoForward: webContents.navigationHistory.canGoForward(),
    loading: webContents.isLoading(),
  }
}

// Push the navigation state to the renderer (toolbar)
function sendNavigationState(profileId: string): void {
  const rendererView = global.__rendererView as WebContentsView | undefined
  if (!rendererView || rendererView.webContents.isDestroyed()) return
  rendererView.webContents.send(IPC_CHANNELS.NAVIGATION_STATE, getNavigationState(profileId))
}

// Tabs of a profile as shown in the tab bar (null if the profile has no tabs yet)
// Profiles in minimal mode whose address bar was asked for (Ctrl/Cmd+L) and is still wanted
const revealedToolbars = new Set<string>()

// Bars above the page of a profile. The tab bar is shown only while there is more than one tab
// (new tabs need it to be switched back), and the toolbar unless the profile is in minimal mode
// (or the page is blocked by an error, where the address is worth seeing, or Ctrl/Cmd+L asked).
export function computeChrome(profileId: string): ChromeState {
  const entry = profileTabs.get(profileId)
  const tabCount = entry?.tabs.length ?? 1
  const minimal = !!getProfileById(profileId)?.minimalMode
  const active = getActiveTab(profileId)

  return {
    tabBar: tabCount > 1,
    toolbar: !minimal || revealedToolbars.has(profileId) || (!!active && isBlocked(active)),
  }
}

// Tell the layout which bars the profile on screen has (the page is placed below them)
function syncChrome(profileId: string): ChromeState {
  const chrome = computeChrome(profileId)
  if (getActiveProfileId() === profileId) setCurrentChrome(chrome)
  return chrome
}

export function getTabsState(profileId: string): TabsState | null {
  const entry = profileTabs.get(profileId)
  if (!entry) return null

  return {
    profileId,
    chrome: computeChrome(profileId),
    activeTabId: entry.activeTabId,
    tabs: entry.tabs.map(({ id, view, crashed, favicon, certError, certBypassed, loadError }) => {
      const alive = isAlive(view)
      return {
        id,
        title: alive ? view.webContents.getTitle() : '',
        url: alive ? view.webContents.getURL() : '',
        favicon: favicon ?? '',
        loading: alive ? view.webContents.isLoading() : false,
        crashed,
        certError,
        certBypassed,
        loadError,
      }
    }),
  }
}

// Push the tabs to the renderer (tab bar)
function sendTabsState(profileId: string): void {
  const rendererView = global.__rendererView as WebContentsView | undefined
  if (!rendererView || rendererView.webContents.isDestroyed()) return
  rendererView.webContents.send(IPC_CHANNELS.TABS_STATE, getTabsState(profileId))
}

// A profile is on screen when it is the active one and the settings modal is not covering it
function isProfileDisplayed(profileId: string): boolean {
  return getActiveProfileId() === profileId && !(global.__isSettingsModalOpen ?? false)
}

// Get the session of a profile and set up its handlers once (session-level settings)
function ensureProfileSession(profileId: string, profile: Profile): Session {
  // Create session with partition (for session isolation)
  const profileSession = session.fromPartition(`persist:profile-${profileId}`)
  if (initializedSessions.has(profileId)) return profileSession
  initializedSessions.add(profileId)

  // Remember the certificate of every successful TLS check (the verdict stays Chromium's: -3)
  profileSession.setCertificateVerifyProc((request, callback) => {
    if (request.verificationResult === 'net::OK') {
      const { certificate } = request
      let certs = validCerts.get(profileId)
      if (!certs) {
        certs = new Map()
        validCerts.set(profileId, certs)
      }
      certs.set(request.hostname, {
        subject: certificate.subjectName,
        issuer: certificate.issuerName,
        validFrom: certificate.validStart,
        validTo: certificate.validExpiry,
        fingerprint: certificate.fingerprint,
      })
    }
    callback(-3)
  })

  profileSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: offlineMode && /^(https?|wss?):/.test(details.url) })
  })

  // Determine language to use (profile language or system default)
  const language = profile.language || getSystemLocale()

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

      // Resolve the window at request time (it is recreated when the app is reopened)
      const mainWindow = global.__mainWindow
      if (!mainWindow) {
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

  sessionProfileIds.set(profileSession, profileId)

  // Set Accept-Language header via webRequest
  profileSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Accept-Language'] = language
    callback({ requestHeaders: details.requestHeaders })
  })

  return profileSession
}

// Create a tab (WebContentsView) for a profile (tab-level settings) and load the url.
// For window.open() Electron has already created the contents (on the opener's session) and
// navigates it itself, so it is passed in instead of a url.
function createTab(
  profileId: string,
  profile: Profile,
  mainWindow: BaseWindow,
  source: { url: string } | { webContents: WebContents }
): Tab {
  const view = new WebContentsView(
    'webContents' in source
      ? { webContents: source.webContents }
      : {
          webPreferences: {
            session: ensureProfileSession(profileId, profile),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        }
  )

  const tabId = nextTabId++

  // The page can close itself (window.close(), e.g. a login popup that is done), which destroys
  // its contents; drop the tab with it. Tabs closed on purpose are already off the list by the
  // time their contents is destroyed, so this does nothing for them.
  const contentsId = view.webContents.id
  view.webContents.on('destroyed', () => {
    FindbarWindow.destroyForId(contentsId)
    closeTab(profileId, tabId, mainWindow)
  })

  // Keep the tab bar (and the toolbar, while this tab is the one being shown) in sync
  const syncState = () => {
    if (getActiveProfileId() !== profileId) return
    sendTabsState(profileId)
    if (getActiveTab(profileId)?.id === tabId) {
      sendNavigationState(profileId)
    }
  }
  view.webContents.on('did-navigate', syncState)
  view.webContents.on('did-navigate-in-page', syncState)
  view.webContents.on('did-start-loading', syncState)
  view.webContents.on('did-stop-loading', syncState)
  view.webContents.on('page-title-updated', syncState)

  // Favicon for the tab bar. Reset on a new page so a stale icon does not stay on a page
  // that has none (the page reports its icon again once it loads).
  const setFavicon = (favicon: string) => {
    const tab = profileTabs.get(profileId)?.tabs.find((t) => t.id === tabId)
    if (!tab || tab.favicon === favicon) return
    tab.favicon = favicon
    syncState()
  }
  view.webContents.on('did-navigate', () => setFavicon(''))
  view.webContents.on('page-favicon-updated', (_event, favicons) => setFavicon(favicons[0] ?? ''))

  // Handle crash / hang: only this tab is marked, the others stay usable
  const markCrashed = () => {
    const tab = profileTabs.get(profileId)?.tabs.find((t) => t.id === tabId)
    if (tab) tab.crashed = true

    const rendererView = global.__rendererView as WebContentsView | undefined
    rendererView?.webContents.send(IPC_CHANNELS.PROFILE_VIEW_CRASHED, profileId)
    refreshDisplay(profileId, mainWindow)
  }

  view.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Profile:${profileId}] Render process gone:`, details.reason)
    if (details.reason !== 'killed' && details.reason !== 'clean-exit') {
      markCrashed()
    }
  })

  // A page that fails on its certificate is blocked behind an error screen; a new navigation
  // (back, reload, another URL) lifts it, and fails again if the certificate is still bad
  const setCertError = (certError: CertErrorInfo | undefined) => {
    const tab = profileTabs.get(profileId)?.tabs.find((t) => t.id === tabId)
    if (!tab || (!tab.certError && !certError)) return
    tab.certError = certError
    refreshDisplay(profileId, mainWindow)
  }
  // A page that cannot be reached is blocked behind an error screen as well
  const setLoadError = (loadError: LoadErrorInfo | undefined) => {
    const tab = profileTabs.get(profileId)?.tabs.find((t) => t.id === tabId)
    if (!tab || (!tab.loadError && !loadError)) return
    tab.loadError = loadError
    refreshDisplay(profileId, mainWindow)

    // The game on the error screen takes keyboard input, which the hidden page view still holds
    if (loadError && getActiveTab(profileId)?.id === tabId && isProfileDisplayed(profileId)) {
      ;(global.__rendererView as WebContentsView | undefined)?.webContents.focus()
    }
  }
  view.webContents.on('did-start-navigation', (details) => {
    if (!details.isMainFrame || details.isSameDocument) return
    const tab = profileTabs.get(profileId)?.tabs.find((t) => t.id === tabId)
    if (tab) tab.certBypassed = false
    setCertError(undefined)
    setLoadError(undefined)
  })
  view.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      // The "work offline" switch refuses requests; show it the way a lost connection is shown
      if (errorCode === ERR_BLOCKED_BY_CLIENT && offlineMode) {
        setLoadError({ url: validatedURL, error: 'ERR_INTERNET_DISCONNECTED', offline: true })
        return
      }
      if (isNetworkErrorCode(errorCode)) {
        setLoadError({
          url: validatedURL,
          error: errorDescription,
          offline: errorCode === ERR_INTERNET_DISCONNECTED,
        })
        return
      }
      if (!isCertErrorCode(errorCode)) return
      let hostname = ''
      let host = ''
      try {
        ;({ hostname, host } = new URL(validatedURL))
      } catch (_e) {
        return
      }
      setCertError({
        url: validatedURL,
        hostname,
        error: errorDescription,
        ...certFailures.get(profileId)?.get(host),
      })
    }
  )

  view.webContents.on('unresponsive', () => {
    console.warn(`[Profile:${profileId}] View became unresponsive`)
    markCrashed()
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

  // Setup context menu (new tabs open next to this one, like links with target=_blank)
  applyContextMenu(view, {
    openInNewTab: (url, options) =>
      openTab(
        profileId,
        profile,
        mainWindow,
        { url },
        { activate: !options?.background, afterTabId: tabId }
      ),
  })

  // Setup findbar
  const findbar = FindbarWindow.from(mainWindow, view.webContents)

  // Ctrl+F / Cmd+F → open findbar
  view.webContents.on('before-input-event', (event, input) => {
    if (handleBrowserShortcut(input)) {
      event.preventDefault()
      return
    }
    if (
      (input.control || input.meta) &&
      input.key.toLowerCase() === 'f' &&
      input.type === 'keyDown'
    ) {
      event.preventDefault()
      findbar.open()
    }
  })

  // A plain click on a mail link is a navigation, and Electron does not hand those to the OS
  // by itself
  view.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedExternalUrl(url)) return
    event.preventDefault()
    openExternalIfAllowed(url)
  })

  view.webContents.setWindowOpenHandler((details) => {
    // Anything that is not a web page goes to the OS, but only mail links (see
    // externalLinks.ts); every other scheme is dropped
    if (!isWebUrl(details.url)) {
      openExternalIfAllowed(details.url)
      return { action: 'deny' }
    }

    // Every window.open() and target=_blank link opens as a new tab of this profile (popups
    // with a size or a name too), on the same session so the login carries over.
    // The tab's contents is handed back so window.open() returns a window instead of null;
    // pages like Gmail's "Show original" take null for a blocked popup and warn about it.
    return {
      action: 'allow',
      createWindow: (options) => {
        // Electron passes the contents it created, which its typings do not list
        const { webContents } = options as { webContents?: WebContents }
        if (!webContents) throw new Error('window.open() gave no webContents')
        return openTab(
          profileId,
          profile,
          mainWindow,
          { webContents },
          {
            activate: details.disposition !== 'background-tab',
            afterTabId: tabId,
          }
        ).view.webContents
      },
    }
  })

  if ('url' in source) view.webContents.loadURL(source.url)

  return { id: tabId, view, crashed: false }
}

// Get the active tab of a profile, creating the first tab (home URL) if the profile has none
function getOrCreateActiveTab(profileId: string, mainWindow: BaseWindow): Tab {
  const existing = getActiveTab(profileId)
  if (existing) return existing

  // Get profile data
  const profile = getProfileById(profileId)
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`)
  }

  const tab = createTab(profileId, profile, mainWindow, { url: profile.homeUrl })
  profileTabs.set(profileId, { tabs: [tab], activeTabId: tab.id })
  return tab
}

function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' || url === 'about:blank'
  } catch (_e) {
    return false
  }
}

// Show the active tab if the profile is on screen, otherwise just tell the tab bar
function refreshDisplay(profileId: string, mainWindow: BaseWindow): void {
  if (isProfileDisplayed(profileId)) {
    showBrowserView(profileId, mainWindow)
  } else if (getActiveProfileId() === profileId) {
    syncChrome(profileId)
    sendTabsState(profileId)
  }
}

function setActiveTab(profileId: string, tabId: number, mainWindow: BaseWindow): void {
  const entry = profileTabs.get(profileId)
  if (!entry) return

  // The findbar belongs to a tab, so close it when leaving the tab
  const previous = getActiveTab(profileId)
  if (previous && previous.id !== tabId) {
    FindbarWindow.from(mainWindow, previous.view.webContents).close()
  }

  entry.activeTabId = tabId
  refreshDisplay(profileId, mainWindow)

  // The previous tab's view keeps the keyboard focus while hidden, which would swallow
  // shortcuts, so move the focus to the tab that is now shown
  const active = getActiveTab(profileId)
  if (active && !isBlocked(active) && isProfileDisplayed(profileId)) {
    active.view.webContents.focus()
  }
}

// Open a new tab of a profile (next to afterTabId if given)
function openTab(
  profileId: string,
  profile: Profile,
  mainWindow: BaseWindow,
  source: { url: string } | { webContents: WebContents },
  options: { activate: boolean; afterTabId?: number }
): Tab {
  const entry = profileTabs.get(profileId)
  if (!entry) throw new Error(`Profile has no tabs: ${profileId}`)

  const tab = createTab(profileId, profile, mainWindow, source)
  tab.openerId = options.afterTabId

  // Next to the opener, after the tabs it already opened (like browsers); at the end otherwise
  let insertAt = entry.tabs.length
  const openerIndex = entry.tabs.findIndex((t) => t.id === options.afterTabId)
  if (openerIndex !== -1) {
    insertAt = openerIndex + 1
    while (entry.tabs[insertAt]?.openerId === options.afterTabId) insertAt++
  }
  entry.tabs.splice(insertAt, 0, tab)

  if (options.activate) {
    // A tab opened by a profile that is not on screen (a notification click, for example) would
    // open where nobody can see it, so bring that profile to the front
    if (getActiveProfileId() !== profileId && !(global.__isSettingsModalOpen ?? false)) {
      setActiveProfileId(profileId)
      const rendererView = global.__rendererView as WebContentsView | undefined
      rendererView?.webContents.send(IPC_CHANNELS.PROFILE_ACTIVATED, profileId)
    }
    setActiveTab(profileId, tab.id, mainWindow)
  } else if (getActiveProfileId() === profileId) {
    sendTabsState(profileId)
  }
  return tab
}

// Open a new tab with the profile's home URL (from the tab bar)
export function newTab(profileId: string, mainWindow: BaseWindow): void {
  const profile = getProfileById(profileId)
  const entry = profileTabs.get(profileId)
  if (!profile || !entry) return

  openTab(profileId, profile, mainWindow, { url: profile.homeUrl }, { activate: true })
}

export function activateTab(profileId: string, tabId: number, mainWindow: BaseWindow): void {
  if (profileTabs.get(profileId)?.tabs.some((tab) => tab.id === tabId)) {
    setActiveTab(profileId, tabId, mainWindow)
  }
}

// Close a tab. Closing the last tab leaves a fresh tab with the home URL.
export function closeTab(profileId: string, tabId: number, mainWindow: BaseWindow): void {
  const entry = profileTabs.get(profileId)
  const index = entry?.tabs.findIndex((tab) => tab.id === tabId) ?? -1
  if (!entry || index === -1) return

  const [tab] = entry.tabs.splice(index, 1)
  destroyTab(tab, mainWindow)

  if (entry.tabs.length === 0) {
    const profile = getProfileById(profileId)
    if (!profile) return
    const home = createTab(profileId, profile, mainWindow, { url: profile.homeUrl })
    entry.tabs.push(home)
    entry.activeTabId = home.id
  } else if (entry.activeTabId === tabId) {
    // Like browsers: the tab to the right takes over, or the last one
    entry.activeTabId = entry.tabs[Math.min(index, entry.tabs.length - 1)].id
  }

  refreshDisplay(profileId, mainWindow)
}

// Get WebContentsView of the active tab for a profile
export function getBrowserView(profileId: string): WebContentsView | undefined {
  return getActiveTab(profileId)?.view
}

// Show WebContentsView for active profile
export function showBrowserView(profileId: string, mainWindow: BaseWindow): void {
  // Hide all views first
  hideAllBrowserViews(mainWindow)

  // Get or create the view
  const tab = getOrCreateActiveTab(profileId, mainWindow)
  const view = tab.view

  // Add profileView to window
  const contentView = mainWindow.contentView
  if (!contentView.children.includes(view)) {
    contentView.addChildView(view)
  }

  // A blocked tab (crashed, certificate error, unreachable) stays hidden so the renderer can
  // show its error screen
  syncChrome(profileId)
  view.setBounds(isBlocked(tab) ? HIDDEN_BOUNDS : getContentViewBounds(mainWindow))
  sendNavigationState(profileId)
  sendTabsState(profileId)
}

// Hide all WebContentsViews
export function hideAllBrowserViews(mainWindow: BaseWindow): void {
  const contentView = mainWindow.contentView
  profileTabs.forEach(({ tabs }) => {
    for (const { view } of tabs) {
      if (contentView.children.includes(view)) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    }
  })
}

// Remove all tabs for a profile (when profile is deleted)
export function removeBrowserView(profileId: string, mainWindow: BaseWindow): void {
  const entry = profileTabs.get(profileId)
  if (entry) {
    // Off the list first, so closing the contents does not look like a page closing itself
    profileTabs.delete(profileId)
    revealedToolbars.delete(profileId)
    for (const tab of entry.tabs) destroyTab(tab, mainWindow)
  }
  // Session handlers capture profile settings (e.g. language), so set them up again next time
  initializedSessions.delete(profileId)
  // Certificates remembered for this profile (including the ones the user chose to trust)
  trustedCerts.delete(profileId)
  certFailures.delete(profileId)
  validCerts.delete(profileId)
}

// Destroy all WebContentsViews (when the main window is closed).
// The views and their findbars hold the old window as parent, so they must be
// recreated against the new window (e.g. macOS reopen from the Dock).
export function destroyAllBrowserViews(): void {
  const all = [...profileTabs.values()].flatMap(({ tabs }) => tabs)
  // Off the list first, so closing the contents does not look like a page closing itself
  profileTabs.clear()
  revealedToolbars.clear()
  initializedSessions.clear()
  for (const { view } of all) {
    if (!isAlive(view)) continue
    FindbarWindow.destroyForContents(view.webContents)
    view.webContents.close()
  }
}

// Recreate WebContentsView (e.g., when language settings change)
export function recreateBrowserView(profileId: string, mainWindow: BaseWindow): void {
  removeBrowserView(profileId, mainWindow)
  showBrowserView(profileId, mainWindow)
}

// Update bounds when window is resized
export function updateBrowserViewBounds(
  activeProfileId: string | null,
  mainWindow: BaseWindow
): void {
  if (!activeProfileId) return

  const tab = getActiveTab(activeProfileId)
  if (!tab || isBlocked(tab)) return

  syncChrome(activeProfileId)
  tab.view.setBounds(getContentViewBounds(mainWindow))
}

// Force repaint WebContentsView
// invalidate() alone is not enough when the window comes back from an inactive state
// (the view stays blank until its bounds change), so nudge the bounds by 1px and restore them.
export function repaintBrowserView(activeProfileId: string | null): void {
  if (!activeProfileId) return

  const view = getBrowserView(activeProfileId)
  if (!view || !isAlive(view)) return

  const bounds = view.getBounds()
  if (bounds.width > 1 && bounds.height > 0) {
    view.setBounds({ ...bounds, width: bounds.width - 1 })
    view.setBounds(bounds)
  }
  view.webContents.invalidate()
}

// Remove a tab's view from the window and destroy it
function destroyTab(tab: Tab, mainWindow: BaseWindow): void {
  // A page that closed itself is already destroyed (and its findbar with it)
  const alive = isAlive(tab.view)
  if (alive) FindbarWindow.destroyForContents(tab.view.webContents)
  if (mainWindow.contentView.children.includes(tab.view)) {
    mainWindow.contentView.removeChildView(tab.view)
  }
  if (alive) tab.view.webContents.close()
}

// Ask the server for its certificate (the page may have come from the cache, so no check was
// recorded). Only a certificate this computer trusts is returned, like the ones recorded.
function fetchCertificate(hostname: string, port: number): Promise<CertDetails | null> {
  return new Promise((resolve) => {
    const socket = connect({
      host: hostname,
      port,
      servername: hostname,
      rejectUnauthorized: false,
    })
    const done = (details: CertDetails | null) => {
      socket.destroy()
      resolve(details)
    }
    socket.setTimeout(5000, () => done(null))
    socket.once('error', () => done(null))
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate()
      if (!socket.authorized || !cert?.raw) {
        done(null)
        return
      }
      // Same notations as Electron's certificate objects (name, seconds, sha256/base64)
      done({
        subject: [cert.subject?.CN].flat()[0],
        issuer: [cert.issuer?.CN].flat()[0],
        validFrom: Math.floor(Date.parse(cert.valid_from) / 1000),
        validTo: Math.floor(Date.parse(cert.valid_to) / 1000),
        fingerprint: `sha256/${createHash('sha256').update(cert.raw).digest('base64')}`,
      })
    })
  })
}

// Show the certificate of the page in the active tab in a native dialog (the address bar's lock)
export async function showCertInfo(profileId: string, mainWindow: BaseWindow): Promise<void> {
  const tab = getActiveTab(profileId)
  if (!tab || !isAlive(tab.view)) return

  let url: URL
  try {
    url = new URL(tab.certError?.url ?? tab.view.webContents.getURL())
  } catch (_e) {
    return
  }

  if (url.protocol !== 'https:') {
    await showCertWindow(mainWindow, {
      tone: 'warning',
      title: 'Connection is not secure',
      text: 'Information you send to this site (passwords, card numbers...) can be seen by others.',
      address: url.href,
    })
    return
  }

  // A page blocked by (or loaded despite) a certificate error: the error check remembered it
  let details: CertDetails | null | undefined = tab.certError
    ? tab.certError
    : tab.certBypassed
      ? certFailures.get(profileId)?.get(url.host)
      : validCerts.get(profileId)?.get(url.hostname)
  if (!details && !tab.certError && !tab.certBypassed) {
    details = await fetchCertificate(url.hostname, Number(url.port) || 443)
    if (details) {
      const certs = validCerts.get(profileId) ?? new Map<string, CertDetails>()
      certs.set(url.hostname, details)
      validCerts.set(profileId, certs)
    }
  }

  const invalid = !!tab.certError || !!tab.certBypassed
  await showCertWindow(mainWindow, {
    tone: invalid ? 'warning' : 'secure',
    title: invalid ? 'Certificate is not valid' : 'Connection is secure',
    text: tab.certBypassed
      ? 'This page was opened because you chose to proceed despite a certificate error.'
      : invalid
        ? 'The certificate of this site could not be verified.'
        : 'Information you send to this site is encrypted, and its certificate is valid.',
    address: url.href,
    details,
  })
}

// Certificate error screen, "Back to safety": the previous page, or the home page if there is none
export function leaveCertError(profileId: string): void {
  const tab = getActiveTab(profileId)
  const profile = getProfileById(profileId)
  if (!tab?.certError || !isAlive(tab.view)) return

  const { webContents } = tab.view
  if (webContents.navigationHistory.canGoBack()) {
    webContents.navigationHistory.goBack()
  } else if (profile) {
    webContents.loadURL(profile.homeUrl)
  }
}

// Certificate error screen, "Proceed": trust this certificate for the host in this profile
// (until the app quits) and load the page again
export function proceedCertError(profileId: string): void {
  const tab = getActiveTab(profileId)
  if (!tab?.certError || !isAlive(tab.view)) return

  const { hostname, fingerprint, url } = tab.certError
  if (!fingerprint) return

  const trusted = trustedCerts.get(profileId) ?? new Set<string>()
  trusted.add(trustKey(hostname, fingerprint))
  trustedCerts.set(profileId, trusted)
  tab.view.webContents.loadURL(url)
}

// Reload the active tab. A crashed tab is replaced by a fresh one at the same position.
export function reloadActiveTab(profileId: string, mainWindow: BaseWindow): void {
  const entry = profileTabs.get(profileId)
  const tab = getActiveTab(profileId)
  const profile = getProfileById(profileId)
  if (!entry || !tab || !profile) return

  const { webContents } = tab.view
  if (!tab.crashed && !webContents.isDestroyed() && !webContents.isCrashed()) {
    webContents.reload()
    return
  }

  const url = (!webContents.isDestroyed() && webContents.getURL()) || profile.homeUrl
  const fresh = createTab(profileId, profile, mainWindow, { url })
  fresh.openerId = tab.openerId
  entry.tabs[entry.tabs.indexOf(tab)] = fresh
  entry.activeTabId = fresh.id
  destroyTab(tab, mainWindow)
  refreshDisplay(profileId, mainWindow)
}

// Activate the next (offset 1) or previous (offset -1) tab, wrapping around
function switchTab(profileId: string, offset: number, mainWindow: BaseWindow): void {
  const entry = profileTabs.get(profileId)
  if (!entry) return

  const index = entry.tabs.findIndex((tab) => tab.id === entry.activeTabId)
  const next = entry.tabs[(index + offset + entry.tabs.length) % entry.tabs.length]
  setActiveTab(profileId, next.id, mainWindow)
}

// Browser-like keyboard shortcuts. Returns true when the key was handled.
// Used for both the page views and the renderer (address bar, sidebar).
export function handleBrowserShortcut(input: Input): boolean {
  if (input.type !== 'keyDown') return false

  const profileId = getActiveProfileId()
  const mainWindow = global.__mainWindow
  if (!profileId || !mainWindow || (global.__isSettingsModalOpen ?? false)) return false

  const entry = profileTabs.get(profileId)
  const mod = input.control || input.meta
  const key = input.key.toLowerCase()

  if (mod && !input.shift && !input.alt) {
    switch (key) {
      case 't':
        newTab(profileId, mainWindow)
        return true
      case 'w':
        if (entry) closeTab(profileId, entry.activeTabId, mainWindow)
        return true
      case 'r':
        reloadActiveTab(profileId, mainWindow)
        return true
      case 'l': {
        // In minimal mode the address bar is hidden: bring it back until it loses the focus
        if (getProfileById(profileId)?.minimalMode && !revealedToolbars.has(profileId)) {
          revealedToolbars.add(profileId)
          refreshDisplay(profileId, mainWindow)
        }
        const rendererView = global.__rendererView as WebContentsView | undefined
        rendererView?.webContents.focus()
        // Let the renderer take the focus first (and draw the address bar), otherwise the input
        // is focused without a caret
        setTimeout(() => {
          rendererView?.webContents.send(IPC_CHANNELS.NAVIGATION_FOCUS_URL)
        }, 80)
        return true
      }
      case '[':
      case ']': {
        // macOS: Cmd+[ / Cmd+]
        if (!input.meta) return false
        const history = getBrowserView(profileId)?.webContents.navigationHistory
        if (key === '[') history?.goBack()
        else history?.goForward()
        return true
      }
    }
  }

  // Ctrl+Tab / Ctrl+Shift+Tab
  if (input.control && key === 'tab') {
    switchTab(profileId, input.shift ? -1 : 1, mainWindow)
    return true
  }

  // Alt+Left / Alt+Right
  if (input.alt && !mod && (key === 'arrowleft' || key === 'arrowright')) {
    const history = getBrowserView(profileId)?.webContents.navigationHistory
    if (key === 'arrowleft') history?.goBack()
    else history?.goForward()
    return true
  }

  return false
}

// The address bar lost the focus: in minimal mode it goes away again and the page gets the focus
export function releaseToolbar(profileId: string, mainWindow: BaseWindow): void {
  if (!revealedToolbars.delete(profileId)) return

  refreshDisplay(profileId, mainWindow)
  const tab = getActiveTab(profileId)
  if (tab && !isBlocked(tab) && isAlive(tab.view) && isProfileDisplayed(profileId)) {
    tab.view.webContents.focus()
  }
}

// The profile's settings changed (minimal mode): lay the page out again
export function refreshProfileChrome(profileId: string, mainWindow: BaseWindow): void {
  if (!profileTabs.has(profileId)) return
  refreshDisplay(profileId, mainWindow)
}
