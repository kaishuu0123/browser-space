import React from 'react'

interface MainContentProps {
  activeProfileId: string | null
}

export function MainContent({ activeProfileId }: MainContentProps): React.ReactElement {
  if (!activeProfileId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="codicon codicon-browser text-6xl text-gray-300 mb-4 block" />
          <p className="text-gray-500">Select a profile to start browsing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <span className="codicon codicon-loading codicon-modifier-spin text-4xl text-blue-500 mb-4 block" />
        <p className="text-gray-600">Loading profile...</p>
        <p className="text-sm text-gray-500 mt-2">Profile ID: {activeProfileId}</p>
      </div>
    </div>
  )
}
