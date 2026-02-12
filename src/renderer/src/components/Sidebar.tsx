import React from 'react'
import { Profile } from '../../../shared/types'
import { ProfileList } from './ProfileList'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  onProfileClick: (profileId: string) => void
  onSettingsClick: () => void
  onReloadClick: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  profiles,
  activeProfileId,
  onProfileClick,
  onSettingsClick,
  onReloadClick,
  collapsed,
  onToggleCollapse,
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
              onClick={onReloadClick}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Reload"
            >
              <span className="codicon codicon-refresh text-lg text-gray-600" />
            </button>
          )}
          <button
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
      />

      {/* Bottom buttons */}
      <div className={`border-t border-gray-200 shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
        {collapsed ? (
          <div className="flex flex-col gap-1">
            <button
              onClick={onReloadClick}
              className="w-full p-2 hover:bg-gray-100 rounded transition-colors"
              title="Reload"
            >
              <span className="codicon codicon-refresh text-xl text-gray-600" />
            </button>
            <button
              onClick={onSettingsClick}
              className="w-full p-2 hover:bg-gray-100 rounded transition-colors"
              title="Settings"
            >
              <span className="codicon codicon-settings-gear text-xl text-gray-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSettingsClick}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded transition-colors text-sm text-gray-600"
            title="Settings"
          >
            <span className="codicon codicon-settings-gear text-lg" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  )
}
