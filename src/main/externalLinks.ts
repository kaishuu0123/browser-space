import { shell } from 'electron'

// What a page may hand to the operating system. shell.openExternal() runs whatever the system has
// registered for a scheme (file:, smb:, ms-msdt:, custom app schemes...), so a page must not be able
// to pass it an arbitrary URL. Only these are opened, like a mail or phone link.
const EXTERNAL_SCHEMES = new Set(['mailto:', 'tel:'])

export function isAllowedExternalUrl(url: string): boolean {
  try {
    return EXTERNAL_SCHEMES.has(new URL(url).protocol)
  } catch (_e) {
    return false
  }
}

// Open a URL from a page with the system, if its scheme is one of the allowed ones; true if opened
export function openExternalIfAllowed(url: string): boolean {
  if (!isAllowedExternalUrl(url)) {
    console.warn(`Blocked an external link with a scheme that is not allowed: ${url.slice(0, 80)}`)
    return false
  }
  void shell.openExternal(url)
  return true
}

// The app's own screen (the renderer view) may only ever show the app's own page: it holds the
// bridge to the main process, so it must not be navigated to anything from the web.
export function isOwnPageUrl(target: string, ownUrl: string): boolean {
  try {
    const a = new URL(target)
    const b = new URL(ownUrl)
    // The dev server serves the page from one origin (reloads and hot updates stay on it); the
    // built app loads one file
    return a.protocol === 'file:'
      ? a.protocol === b.protocol && a.pathname === b.pathname
      : a.origin === b.origin
  } catch (_e) {
    return false
  }
}
