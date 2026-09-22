import { isTauri } from './tauri'

function formatMessage(message: string, data?: Record<string, any>): string {
  if (data && Object.keys(data).length > 0) {
    try {
      return `${message} | ${JSON.stringify(data)}`
    }
    catch {
      return `${message} | [Unserializable data]`
    }
  }
  return message
}

/**
 * 前端统一桌面日志管理器
 * 在 Tauri 环境下写入本地滚动日志文件与标准输出，在 Web 浏览器环境下输出至控制台
 */
export const logger = {
  async trace(message: string, data?: Record<string, any>): Promise<void> {
    if (isTauri()) {
      const { trace } = await import('@tauri-apps/plugin-log')
      await trace(formatMessage(message, data))
    }
    else {
      // eslint-disable-next-line no-console
      console.trace(message, data ?? '')
    }
  },

  async debug(message: string, data?: Record<string, any>): Promise<void> {
    if (isTauri()) {
      const { debug } = await import('@tauri-apps/plugin-log')
      await debug(formatMessage(message, data))
    }
    else {
      // eslint-disable-next-line no-console
      console.debug(message, data ?? '')
    }
  },

  async info(message: string, data?: Record<string, any>): Promise<void> {
    if (isTauri()) {
      const { info } = await import('@tauri-apps/plugin-log')
      await info(formatMessage(message, data))
    }
    else {
      // eslint-disable-next-line no-console
      console.info(message, data ?? '')
    }
  },

  async warn(message: string, data?: Record<string, any>): Promise<void> {
    if (isTauri()) {
      const { warn } = await import('@tauri-apps/plugin-log')
      await warn(formatMessage(message, data))
    }
    else {
      console.warn(message, data ?? '')
    }
  },

  async error(message: string | Error, data?: Record<string, any>): Promise<void> {
    const text = message instanceof Error ? (message.stack || message.message) : message
    if (isTauri()) {
      const { error } = await import('@tauri-apps/plugin-log')
      await error(formatMessage(text, data))
    }
    else {
      console.error(text, data ?? '')
    }
  },
}
