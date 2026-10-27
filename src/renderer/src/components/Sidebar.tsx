import type React from 'react'
import type { Profile } from '../../../shared/types'
import { ProfileList } from './ProfileList'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  onProfileClick: (profileId: string) => void
  onSettingsClick: () => void
  onReloadClick: () => void
  collapsed: boolean
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
  onToggleCollapse,
  hasUpdate = false,
  updateVersion,
  onInstallUpdate,
  onDismissUpdate,
  crashedProfileIds = new Set(),
}: SidebarProps): React.ReactElement {
  return (
    <div
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        {!collapsed && <h1 className="text-lg font-semibold text-gray-800">Profiles</h1>}
        <div className="flex gap-1">
          {!collapsed && (
            <button
              type="button"
              onClick={onReloadClick}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Reload"
            >
              <span className="codicon codicon-refresh text-lg text-gray-600" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span
              className={`codicon ${collapsed ? 'codicon-chevron-right' : 'codicon-chevron-left'} text-lg text-gray-600`}
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
              className="w-full p-2 mb-1 hover:bg-blue-50 rounded transition-colors"
              title={`Update v${updateVersion} ready. Click to restart and update`}
            >
              <span className="codicon codicon-arrow-circle-up text-xl text-blue-500" />
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
              className="w-full p-2 hover:bg-gray-100 rounded transition-colors"
              title="Reload"
            >
              <span className="codicon codicon-refresh text-xl text-gray-600" />
            </button>
            <button
              type="button"
              onClick={onSettingsClick}
              className="w-full p-2 hover:bg-gray-100 rounded transition-colors"
              title={hasUpdate ? 'Settings (Update ready)' : 'Settings'}
            >
              <span className="relative inline-block">
                <span className="codicon codicon-settings-gear text-xl text-gray-600" />
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
            <span className="relative">
              <span className="codicon codicon-settings-gear text-lg" />
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
    </div>
  )
}
