import React, { useState, useEffect } from 'react'
import { Profile } from '../../../shared/types'

interface ProfileItemProps {
  profile: Profile
  isActive: boolean
  onClick: () => void
  collapsed: boolean
}

export function ProfileItem({
  profile,
  isActive,
  onClick,
  collapsed,
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
      `}
      title={collapsed ? profile.name : undefined}
    >
      {/* Icon */}
      {profile.icon === 'custom' && customIconPath ? (
        <img
          src={`file://${customIconPath}`}
          alt={profile.name}
          className="w-5 h-5 rounded object-cover"
        />
      ) : (
        <span
          className={`codicon codicon-${profile.icon || 'circle-large-outline'} !text-2xl`}
          style={{ color: profile.iconColor }}
        />
      )}

      {/* Profile Name (hidden when collapsed) */}
      {!collapsed && <span className="font-medium text-gray-700 truncate">{profile.name}</span>}
    </button>
  )
}
