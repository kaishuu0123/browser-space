import type React from 'react'
import type { Profile } from '../../../shared/types'
import { ProfileItem } from './ProfileItem'

interface ProfileListProps {
  profiles: Profile[]
  activeProfileId: string | null
  onProfileClick: (profileId: string) => void
  collapsed: boolean
  crashedProfileIds?: Set<string>
}

export function ProfileList({
  profiles,
  activeProfileId,
  onProfileClick,
  collapsed,
  crashedProfileIds = new Set(),
}: ProfileListProps): React.ReactElement {
  if (profiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
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
    // Expanded, the rows sit inside the sidebar's padding (rounded, not edge to edge); collapsed,
    // the narrow column keeps them full width
    <div
      className={`flex-1 overflow-y-auto ${collapsed ? '' : 'grid content-start gap-0.5 px-2 py-1'}`}
    >
      {profiles.map((profile) => (
        <ProfileItem
          key={profile.id}
          profile={profile}
          isActive={profile.id === activeProfileId}
          onClick={() => onProfileClick(profile.id)}
          collapsed={collapsed}
          isCrashed={crashedProfileIds.has(profile.id)}
        />
      ))}
    </div>
  )
}
