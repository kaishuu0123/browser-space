import type React from 'react'
import { SIDEBAR_WIDTH_COLLAPSED } from '../../../shared/layout'
import type { Profile } from '../../../shared/types'
import { ProfileList } from './ProfileList'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  onProfileClick: (profileId: string) => void
  onSettingsClick: () => void
  onReloadClick: () => void
  collapsed: boolean
  // Width while expanded (px)
  width: number
  // Called while dragging; persist is true for the final width on release
  onResize: (width: number, persist: boolean) => void
  // Double click on the edge: back to the default width
  onResetWidth: () => void
  onToggleCollapse: () => void
  hasUpdate?: boolean
  updateVersion?: string
  onInstallUpdate?: () => void
  onDismissUpdate?: () => void
  crashedProfileIds?: Set<string>
}

export function Sidebar({
  profiles,
  activeProfileId,
  onProfileClick,
  onSettingsClick,
  onReloadClick,
  collapsed,
  width,
  onResize,
  onResetWidth,
  onToggleCollapse,
  hasUpdate = false,
  updateVersion,
  onInstallUpdate,
  onDismissUpdate,
  crashedProfileIds = new Set(),
}: SidebarProps): React.ReactElement {
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    let latest = startWidth

    const onMouseMove = (move: MouseEvent) => {
      latest = startWidth + (move.clientX - startX)
      onResize(latest, false)
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.classList.remove('sidebar-resizing')
      onResize(latest, true)
    }
    document.body.classList.add('sidebar-resizing')
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className="relative h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200"
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : width }}
    >
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        {!collapsed && <h1 className="text-lg font-semibold text-gray-800">Profiles</h1>}
        <div className="flex gap-1">
          {!collapsed && (
            <button
              type="button"
              onClick={onReloadClick}
              className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
              title="Reload"
            >
              <span className="codicon codicon-refresh text-lg leading-none text-gray-600" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span
              className={`codicon ${collapsed ? 'codicon-chevron-right' : 'codicon-chevron-left'} text-lg leading-none text-gray-600`}
            />
          </button>
        </div>
      </div>

      {/* Profile List */}
      <ProfileList
        profiles={profiles}
        activeProfileId={activeProfileId}
        onProfileClick={onProfileClick}
        collapsed={collapsed}
        crashedProfileIds={crashedProfileIds}
      />

      {/* Bottom buttons */}
      <div className={`border-t border-gray-200 shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
        {updateVersion &&
          (collapsed ? (
            <button
              type="button"
              onClick={onInstallUpdate}
              className="flex items-center justify-center w-full h-10 mb-1 hover:bg-blue-50 rounded transition-colors"
              title={`Update v${updateVersion} ready. Click to restart and update`}
            >
              <span className="codicon codicon-arrow-circle-up text-xl leading-none text-blue-500" />
            </button>
          ) : (
            <div className="mb-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
              <p className="font-medium">Update v{updateVersion} ready</p>
              <div className="mt-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={onInstallUpdate}
                  className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600 transition-colors"
                >
                  Restart and update
                </button>
                <button
                  type="button"
                  onClick={onDismissUpdate}
                  className="rounded px-2 py-1 hover:bg-blue-100 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          ))}
        {collapsed ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onReloadClick}
              className="flex items-center justify-center w-full h-10 hover:bg-gray-100 rounded transition-colors"
              title="Reload"
            >
              <span className="codicon codicon-refresh text-xl leading-none text-gray-600" />
            </button>
            <button
              type="button"
              onClick={onSettingsClick}
              className="flex items-center justify-center w-full h-10 hover:bg-gray-100 rounded transition-colors"
              title={hasUpdate ? 'Settings (Update ready)' : 'Settings'}
            >
              <span className="relative flex items-center">
                <span className="codicon codicon-settings-gear text-xl leading-none text-gray-600" />
                {hasUpdate && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSettingsClick}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded transition-colors text-sm text-gray-600"
            title="Settings"
          >
            <span className="relative flex items-center">
              <span className="codicon codicon-settings-gear text-lg leading-none" />
              {hasUpdate && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </span>
            <span>Settings</span>
            {hasUpdate && (
              <span className="ml-auto text-xs text-blue-500 font-medium">Update ready</span>
            )}
          </button>
        )}
      </div>

      {/* Drag the right edge to resize, double click to reset (mouse only) */}
      {!collapsed && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Resize sidebar"
          title="Drag to resize, double click to reset"
          onMouseDown={startResize}
          onDoubleClick={onResetWidth}
          className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize hover:bg-blue-400/30 transition-colors"
        />
      )}
    </div>
  )
}
