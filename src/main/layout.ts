import type { BaseWindow, Rectangle, WebContentsView } from 'electron'
import {
  clampSidebarWidth,
  SIDEBAR_WIDTH_COLLAPSED,
  TAB_BAR_HEIGHT,
  TOOLBAR_HEIGHT,
} from '../shared/layout'
import { getSidebarCollapsed, getSidebarWidth as getStoredSidebarWidth } from './settingsManager'

// Height of the strip above the page content (tab bar + toolbar)
const CONTENT_TOP_OFFSET = TAB_BAR_HEIGHT + TOOLBAR_HEIGHT

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
  return {
    x: sidebarWidth,
    y: CONTENT_TOP_OFFSET,
    width: bounds.width - sidebarWidth,
    height: bounds.height - CONTENT_TOP_OFFSET,
  }
}

// The renderer view always covers the whole window and sits below the page views,
// so it is visible only where no page view is placed (sidebar, tab bar, toolbar).
export function layoutRendererView(mainWindow: BaseWindow, rendererView: WebContentsView): void {
  const bounds = mainWindow.getContentBounds()
  rendererView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
}
