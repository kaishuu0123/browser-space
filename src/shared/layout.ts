// One height for the strips along the top: the sidebar header, the tab bar and the toolbar (px).
// 40 leaves the address field room around it. Shared by main (view placement) and renderer (UI).
export const BAR_HEIGHT = 40

// Height of the tab bar at the top of the content area
export const TAB_BAR_HEIGHT = BAR_HEIGHT

// Height of the toolbar below the tab bar
export const TOOLBAR_HEIGHT = BAR_HEIGHT

// Which bars are shown above the page. The main process decides (it places the page views) and
// the renderer follows, so both agree on where the page starts.
export interface ChromeState {
  tabBar: boolean
  toolbar: boolean
}

// What is shown before the main process has said anything
export const DEFAULT_CHROME: ChromeState = { tabBar: false, toolbar: true }

// Height of the strip above the page content
export function chromeHeight(chrome: ChromeState): number {
  return (chrome.tabBar ? TAB_BAR_HEIGHT : 0) + (chrome.toolbar ? TOOLBAR_HEIGHT : 0)
}

// Sidebar widths (px). The expanded width can be dragged between MIN and MAX.
export const SIDEBAR_WIDTH_DEFAULT = 256
export const SIDEBAR_WIDTH_MIN = 180
export const SIDEBAR_WIDTH_MAX = 480
export const SIDEBAR_WIDTH_COLLAPSED = 64

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)))
}
