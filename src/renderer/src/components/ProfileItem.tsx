import React, { useState, useEffect } from 'react'
import { Profile } from '../../../shared/types'

interface ProfileItemProps {
  profile: Profile
  isActive: boolean
  onClick: () => void
  collapsed: boolean
  isCrashed?: boolean
}

export function ProfileItem({
  profile,
  isActive,
  onClick,
  collapsed,
  isCrashed = false,
}: ProfileItemProps): React.ReactElement {
  const [customIconPath, setCustomIconPath] = useState<string | null>(null)

  useEffect(() => {
    if (profile.icon === 'custom' && profile.customIconPath) {
      window.iconApi.getPath(profile.customIconPath).then(setCustomIconPath)
    }
  }, [profile.icon, profile.customIconPath])

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5
        hover:bg-gray-100 transition-colors
        ${isActive ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}
        ${isCrashed ? 'text-red-500' : ''}
      `}
      title={collapsed ? (isCrashed ? `${profile.name} (Crashed)` : profile.name) : undefined}
    >
      {/* Icon Container */}
      <div className="relative flex items-center justify-center">
        {profile.icon === 'custom' && customIconPath ? (
          <img
            src={`file://${customIconPath}`}
            alt={profile.name}
            className="w-5 h-5 rounded object-cover"
          />
        ) : (
          <span
            className={`codicon codicon-${profile.icon || 'circle-large-outline'} !text-2xl`}
            style={{ color: isCrashed ? '#ef4444' : profile.iconColor }}
          />
        )}
        {isCrashed && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Profile Name (hidden when collapsed) */}
      {!collapsed && (
        <span className={`font-medium truncate ${isCrashed ? 'text-red-600' : 'text-gray-700'}`}>
          {profile.name}
        </span>
      )}
      {isCrashed && !collapsed && (
        <span className="codicon codicon-warning text-red-500 ml-auto" />
      )}
    </button>
  )
}
