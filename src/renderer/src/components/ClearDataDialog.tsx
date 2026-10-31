import type React from 'react'
import { useState } from 'react'
import type { Profile } from '../../../shared/types'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

interface ClearDataDialogProps {
  profile: Profile | null
  open: boolean
  onClose: () => void
  onClear: (
    profileId: string,
    options: {
      cookies: boolean
      cache: boolean
      appData: boolean
    }
  ) => Promise<void>
}

export function ClearDataDialog({
  profile,
  open,
  onClose,
  onClear,
}: ClearDataDialogProps): React.ReactElement {
  const [cookies, setCookies] = useState(true)
  const [cache, setCache] = useState(true)
  const [appData, setAppData] = useState(true)
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    if (!profile) return

    if (!cookies && !cache && !appData) {
      alert('Please select at least one data type to clear')
      return
    }

    if (
      !confirm(
        `Are you sure you want to clear the selected data for "${profile.name}"?\n\nThis action cannot be undone.`
      )
    ) {
      return
    }

    setClearing(true)
    try {
      await onClear(profile.id, {
        cookies,
        cache,
        appData,
      })
      alert('Data cleared successfully!')
      onClose()
    } catch (error) {
      console.error('Failed to clear data:', error)
      alert('Failed to clear data')
    } finally {
      setClearing(false)
    }
  }

  const handleClose = () => {
    if (clearing) return
    // Reset checkboxes
    setCookies(true)
    setCache(true)
    setAppData(true)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear Profile Data</DialogTitle>
        </DialogHeader>

        {profile && (
          <div className="flex flex-col gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Profile:</span> {profile.name}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground/80">Select data types to clear:</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cookies}
                  onChange={(e) => setCookies(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                  disabled={clearing}
                />
                <div>
                  <p className="font-medium text-sm">Cookies and other site data</p>
                  <p className="text-xs text-muted-foreground">
                    Sign-in states, preferences, shopping carts
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cache}
                  onChange={(e) => setCache(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                  disabled={clearing}
                />
                <div>
                  <p className="font-medium text-sm">Cached images and files</p>
                  <p className="text-xs text-muted-foreground">
                    Helps sites load faster on repeat visits
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appData}
                  onChange={(e) => setAppData(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                  disabled={clearing}
                />
                <div>
                  <p className="font-medium text-sm">Hosted app data</p>
                  <p className="text-xs text-muted-foreground">
                    LocalStorage, IndexedDB, WebSQL, Service Workers
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-3">
              <p className="text-xs text-yellow-800">
                <span className="font-medium">Warning:</span> This will log you out of websites and
                may reset site preferences.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={clearing}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleClear} disabled={clearing}>
                {clearing ? 'Clearing...' : 'Clear Data'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
