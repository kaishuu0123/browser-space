import React from 'react'
import { Profile } from '../../../shared/types'
import { ProfileItem } from './ProfileItem'

interface ProfileListProps {
  profiles: Profile[]
  activeProfileId: string | null
  onProfileClick: (profileId: string) => void
  collapsed: boolean
}

export function ProfileList({
  profiles,
  activeProfileId,
  onProfileClick,
  collapsed
}: ProfileListProps): React.ReactElement {
  if (profiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 text-center">
          {collapsed ? (
            <span className="codicon codicon-inbox text-2xl" />
          ) : (
            <>
              No profiles yet.
              <br />
              Click the gear icon to create one.
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {profiles.map((profile) => (
        <ProfileItem
          key={profile.id}
          profile={profile}
          isActive={profile.id === activeProfileId}
          onClick={() => onProfileClick(profile.id)}
          collapsed={collapsed}
        />
      ))}
    </div>
  )
}
