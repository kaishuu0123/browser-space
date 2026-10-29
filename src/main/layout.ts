import type { BaseWindow, Rectangle, WebContentsView } from 'electron'
import {
  type ChromeState,
  chromeHeight,
  clampSidebarWidth,
  DEFAULT_CHROME,
  SIDEBAR_WIDTH_COLLAPSED,
} from '../shared/layout'
import { getSidebarCollapsed, getSidebarWidth as getStoredSidebarWidth } from './settingsManager'

// Bars shown above the page of the profile on screen (set by the view manager whenever it
// changes), which decides where the page starts
let currentChrome: ChromeState = DEFAULT_CHROME

export function setCurrentChrome(chrome: ChromeState): void {
  currentChrome = chrome
}

// Height of the strip above the page content (tab bar and/or toolbar)
export function getContentTop(): number {
  return chromeHeight(currentChrome)
}

// Expanded width, kept in memory so dragging can move the page views live without writing
// the settings file on every mouse move
let expandedWidth = getStoredSidebarWidth()

export function setExpandedSidebarWidth(width: number): void {
  expandedWidth = clampSidebarWidth(width)
}

export function getSidebarWidth(): number {
  return getSidebarCollapsed() ? SIDEBAR_WIDTH_COLLAPSED : expandedWidth
}

// Bounds of the area where page views are shown (right of the sidebar)
export function getContentViewBounds(mainWindow: BaseWindow): Rectangle {
  const bounds = mainWindow.getContentBounds()
  const sidebarWidth = getSidebarWidth()
  const top = getContentTop()
  return {
    x: sidebarWidth,
    y: top,
    width: bounds.width - sidebarWidth,
    height: bounds.height - top,
  }
}

// The renderer view always covers the whole window and sits below the page views,
// so it is visible only where no page view is placed (sidebar, tab bar, toolbar).
export function layoutRendererView(mainWindow: BaseWindow, rendererView: WebContentsView): void {
  const bounds = mainWindow.getContentBounds()
  rendererView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
}
