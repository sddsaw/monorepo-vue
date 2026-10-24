import { emitAppEvent } from '../services/events'
import { logger } from './logger'
import { isMacOS, isTauri } from './tauri'

let windowShortcutBound = false

/**
 * 注册桌面端全局快捷键与跨平台窗口内快捷键（兼容 macOS 与 Windows）
 */
export async function setupGlobalShortcuts(): Promise<void> {
  // Windows / Linux 无顶部原生应用菜单栏，绑定 Ctrl+, 打开偏好设置抽屉以对齐 macOS Cmd+, 体验
  if (!windowShortcutBound && typeof window !== 'undefined' && !isMacOS()) {
    windowShortcutBound = true
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        void emitAppEvent('open-settings', undefined)
      }
    })
  }

  if (!isTauri()) {
    logger.debug('当前为 Web 环境，跳过全局快捷键注册')
    return
  }

  try {
    const { register, isRegistered } = await import('@tauri-apps/plugin-global-shortcut')
    const { getCurrentWindow, Window } = await import('@tauri-apps/api/window')

    const currentWin = getCurrentWindow()
    // 仅在主窗口执行注册，避免子窗口重复注册
    if (currentWin.label !== 'main')
      return

    const shortcut = 'Alt+Shift+S'

    const already = await isRegistered(shortcut)
    if (!already) {
      await register(shortcut, async (event) => {
        if (event.state === 'Pressed') {
          logger.info(`触发全局快捷键: ${event.shortcut}，正在唤醒并聚焦主窗口`)
          const mainWin = await Window.getByLabel('main') || currentWin
          if (mainWin) {
            const isMinimized = await mainWin.isMinimized()
            if (isMinimized) {
              await mainWin.unminimize()
            }
            await mainWin.show()
            await mainWin.setFocus()
          }
        }
      })
      logger.info(`全局快捷键 [${shortcut}] 注册成功 (快速唤醒应用)`)
    }
  }
  catch (err) {
    logger.warn('全局快捷键注册失败或可能被其他应用占用', { error: String(err) })
  }
}
