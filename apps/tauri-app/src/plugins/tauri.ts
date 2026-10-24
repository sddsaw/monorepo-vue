/**
 * 检查当前运行环境是否在 Tauri 客户端内
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 检查当前操作系统是否为 macOS
 */
export function isMacOS(): boolean {
  if (typeof navigator === 'undefined')
    return false
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
}

/**
 * 检查当前操作系统是否为 Windows
 */
export function isWindows(): boolean {
  if (typeof navigator === 'undefined')
    return false
  return /Win/i.test(navigator.userAgent)
}

/**
 * 获取当前窗口标识（Web 环境默认返回 'main'）
 */
export async function getCurrentWindowLabel(): Promise<string> {
  if (!isTauri())
    return 'main'

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    return getCurrentWindow().label
  }
  catch {
    return 'main'
  }
}

/**
 * 判断当前是否为主窗口（用于隔离主窗口专属的全局服务，避免子窗口重复初始化）
 */
export async function isMainWindow(): Promise<boolean> {
  return (await getCurrentWindowLabel()) === 'main'
}
