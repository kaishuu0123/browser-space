// Height of the tab bar at the top of the content area (px)
export const TAB_BAR_HEIGHT = 36

// Height of the toolbar below the tab bar (px). Shared by main (view placement) and renderer (UI)
export const TOOLBAR_HEIGHT = 40

// Sidebar widths (px). The expanded width can be dragged between MIN and MAX.
export const SIDEBAR_WIDTH_DEFAULT = 256
export const SIDEBAR_WIDTH_MIN = 180
export const SIDEBAR_WIDTH_MAX = 480
export const SIDEBAR_WIDTH_COLLAPSED = 64

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)))
}
