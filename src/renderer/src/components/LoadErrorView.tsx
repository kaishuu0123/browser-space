import type React from 'react'
import type { LoadErrorInfo } from '../../../shared/types'
import { OfflineGame } from './OfflineGame'
import { Button } from './ui/button'

interface LoadErrorViewProps {
  info: LoadErrorInfo
  onRetry: () => void
}

// What Chromium's error name means for the person looking at the screen
const ERROR_REASONS: Record<string, string> = {
  ERR_INTERNET_DISCONNECTED: 'Your computer is not connected to the internet.',
  ERR_NAME_NOT_RESOLVED: 'The server address could not be found. Check the address for typos.',
  ERR_CONNECTION_REFUSED: 'The server refused the connection. It may be down.',
  ERR_CONNECTION_TIMED_OUT: 'The server took too long to respond.',
  ERR_TIMED_OUT: 'The server took too long to respond.',
  ERR_CONNECTION_RESET: 'The connection was reset.',
  ERR_ADDRESS_UNREACHABLE: 'The server cannot be reached from this network.',
  ERR_NETWORK_CHANGED: 'The network connection changed while the page was loading.',
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch (_e) {
    return url
  }
}

export function LoadErrorView({ info, onRetry }: LoadErrorViewProps): React.ReactElement {
  const reason = ERROR_REASONS[info.error] ?? 'The page could not be loaded.'

  return (
    // m-auto (not justify-center) keeps the top reachable when the card is taller than the window
    <div className="flex bg-gray-50 h-full w-full overflow-auto">
      <div className="m-auto max-w-lg w-full p-6 text-center">
        <div className="mb-4">
          <span
            className={`codicon ${info.offline ? 'codicon-debug-disconnect' : 'codicon-error'} text-5xl text-gray-400`}
          />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {info.offline ? "You're offline" : `Can't reach ${hostOf(info.url)}`}
        </h2>
        <p className="text-gray-600 mb-1">{reason}</p>
        <p className="text-xs text-gray-400 font-mono mb-6">{info.error}</p>

        <Button onClick={onRetry} className="mb-6">
          Try again
        </Button>
        {info.offline && (
          <p className="text-xs text-gray-400 mb-4">
            The page loads again by itself when the connection is back.
          </p>
        )}

        <div className="bg-white rounded-lg border border-gray-100 shadow-xs inline-block max-w-full overflow-hidden">
          <OfflineGame />
        </div>
      </div>
    </div>
  )
}
