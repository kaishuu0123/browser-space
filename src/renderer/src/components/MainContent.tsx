import type React from 'react'

interface MainContentProps {
  activeProfileId: string | null
}

export function MainContent({ activeProfileId }: MainContentProps): React.ReactElement {
  if (!activeProfileId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted">
        <div className="text-center">
          <span className="codicon codicon-browser text-6xl text-muted-foreground mb-4 block" />
          <p className="text-muted-foreground">Select a profile to start browsing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-muted">
      <div className="text-center">
        <span className="codicon codicon-loading codicon-modifier-spin text-4xl text-blue-500 mb-4 block" />
        <p className="text-foreground/80">Loading profile...</p>
        <p className="text-sm text-muted-foreground mt-2">Profile ID: {activeProfileId}</p>
      </div>
    </div>
  )
}
