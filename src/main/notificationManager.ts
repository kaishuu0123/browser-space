import { BrowserWindow, BaseWindow, dialog } from 'electron'
import { getProfileById, updateProfile } from './profileManager'

interface NotificationPermissionRequest {
  profileId: string
  domain: string
  url: string
}

// Show notification permission dialog
export async function showNotificationPermissionDialog(
  mainWindow: BrowserWindow | BaseWindow,
  request: NotificationPermissionRequest
): Promise<boolean> {
  const profile = getProfileById(request.profileId)
  if (!profile) {
    return false
  }

  // Check notification mode
  if (profile.notificationMode === 'allow-all') {
    // Automatically grant permission
    return true
  }

  if (profile.notificationMode === 'deny-all') {
    // Automatically deny permission
    return false
  }

  // notificationMode === 'ask': Check if already granted or denied
  const existingPermission = profile.notificationPermissions[request.domain]
  if (existingPermission === 'granted') {
    return true
  }
  if (existingPermission === 'denied') {
    return false
  }

  // Show dialog
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Notification Permission',
    message: `Allow "${request.domain}" to show notifications?`,
    detail: `Profile: ${profile.name}\nURL: ${request.url}`,
    buttons: ['Allow', 'Block'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  })

  const granted = result.response === 0

  // Save permission to profile
  const updatedPermissions = {
    ...profile.notificationPermissions,
    [request.domain]: granted ? ('granted' as const) : ('denied' as const),
  }

  await updateProfile(request.profileId, {
    notificationPermissions: updatedPermissions,
  })

  return granted
}

// Check notification permission for a domain
export function checkNotificationPermission(profileId: string, domain: string): boolean {
  const profile = getProfileById(profileId)
  if (!profile) {
    return false
  }

  // Check notification mode first
  if (profile.notificationMode === 'allow-all') {
    return true
  }

  if (profile.notificationMode === 'deny-all') {
    return false
  }

  // notificationMode === 'ask': Check per-domain permission
  return profile.notificationPermissions[domain] === 'granted'
}
