import { isTauri } from '../../plugins/tauri'

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  version?: string
  body?: string
  date?: string
  updateHandle?: any
}

/**
 * 检查应用是否有新版本
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  let currentVersion = '0.1.0'
  if (!isTauri()) {
    return {
      hasUpdate: false,
      currentVersion,
    }
  }

  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    currentVersion = await getVersion()
  }
  catch {
    // 降级兜底
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (update?.available) {
      return {
        hasUpdate: true,
        currentVersion,
        version: update.version,
        body: update.body,
        date: update.date,
        updateHandle: update,
      }
    }
    return {
      hasUpdate: false,
      currentVersion,
    }
  }
  catch {
    // 离线或服务不可用时的安全兜底
    return {
      hasUpdate: false,
      currentVersion,
    }
  }
}

/**
 * 下载并自动安装更新，完成后重启应用
 */
export async function installAppUpdate(
  updateHandle: any,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!isTauri() || !updateHandle)
    return

  let downloaded = 0
  let contentLength = 0

  await updateHandle.downloadAndInstall((event: any) => {
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
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await relaunch()
}
