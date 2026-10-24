import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater'
import { version as packageVersion } from '../../../package.json'
import { isTauri } from '../../plugins/tauri'
import { restartApp } from '../ipc/system'

export type UpdateCheckStatus = 'available' | 'latest' | 'unsupported' | 'error'
export type UpdateHandle = Pick<Update, 'downloadAndInstall'>

export interface UpdateCheckResult {
  hasUpdate: boolean
  status: UpdateCheckStatus
  currentVersion: string
  version?: string
  body?: string
  date?: string
  updateHandle?: UpdateHandle
  errorMessage?: string
}

/**
 * 检查应用是否有新版本
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  let currentVersion = packageVersion
  if (!isTauri()) {
    return {
      hasUpdate: false,
      status: 'unsupported',
      currentVersion,
    }
  }

  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    currentVersion = await getVersion()
  }
  catch {}

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (update) {
      return {
        hasUpdate: true,
        status: 'available',
        currentVersion,
        version: update.version,
        body: update.body,
        date: update.date,
        updateHandle: update,
      }
    }
    return {
      hasUpdate: false,
      status: 'latest',
      currentVersion,
    }
  }
  catch (error) {
    return {
      hasUpdate: false,
      status: 'error',
      currentVersion,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 下载并自动安装更新，完成后重启应用
 */
export async function installAppUpdate(
  updateHandle: UpdateHandle,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!isTauri() || !updateHandle)
    return

  let downloaded = 0
  let contentLength = 0

  await updateHandle.downloadAndInstall((event: DownloadEvent) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength || 0
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        if (contentLength > 0 && onProgress) {
          onProgress(Math.min(100, Math.round((downloaded / contentLength) * 100)))
        }
        break
      case 'Finished':
        if (onProgress)
          onProgress(100)
        break
    }
  })

  // 重启应用以应用更新
  await restartApp()
}
