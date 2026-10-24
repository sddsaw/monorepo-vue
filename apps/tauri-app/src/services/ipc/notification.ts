import { isTauri } from '../../plugins/tauri'

export interface DesktopNotification {
  title: string
  body: string
}

export async function sendDesktopNotification(notification: DesktopNotification): Promise<boolean> {
  if (!isTauri())
    return false

  const {
    isPermissionGranted,
    requestPermission,
    sendNotification,
  } = await import('@tauri-apps/plugin-notification')

  let hasPermission = await isPermissionGranted()
  if (!hasPermission) {
    hasPermission = await requestPermission() === 'granted'
  }

  if (!hasPermission)
    return false

  sendNotification(notification)
  return true
}
