import { isTauri } from '../../plugins/tauri'

export interface WindowOpenOptions {
  /** 窗口唯一标识 */
  label: string
  /** 窗口标题栏文字 */
  title: string
  /** 目标路径（如 'index.html#/sub-window' 或外部 URL） */
  url: string
  /** 初始宽度 */
  width?: number
  /** 初始高度 */
  height?: number
}

/**
 * 打开或激活指定原生窗口
 */
export async function openNewWindow(options: WindowOpenOptions): Promise<void> {
  if (!isTauri()) {
    const isExternal = options.url.startsWith('http://') || options.url.startsWith('https://')
    if (isExternal) {
      window.open(options.url, '_blank')
    }
    else {
      const targetUrl = options.url.includes('#')
        ? options.url
        : `/#${options.url.startsWith('/') ? options.url : `/${options.url}`}`
      const width = options.width || 800
      const height = options.height || 600
      const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2))
      const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2))
      window.open(targetUrl, options.label, `width=${width},height=${height},left=${left},top=${top}`)
    }
    return
  }

  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('open_new_window', {
    label: options.label,
    title: options.title,
    url: options.url,
    width: options.width,
    height: options.height,
  })
}

/**
 * 关闭当前窗口
 */
export async function closeCurrentWindow(): Promise<void> {
  if (!isTauri()) {
    window.close()
    return
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  await win.close()
}
