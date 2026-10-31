import type React from 'react'
import { Button } from './ui/button'

interface CrashedViewProps {
  onReload: () => void
}

export function CrashedView({ onReload }: CrashedViewProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 h-full w-full">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-xs border border-gray-100">
        <span className="codicon codicon-error text-6xl text-red-500 mb-4 block" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          The renderer process for this tab has crashed. This can happen due to high memory usage or
          a bug in the web page.
        </p>
        <Button onClick={onReload} className="w-full">
          Reload Tab
        </Button>
      </div>
    </div>
  )
}
