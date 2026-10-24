import { isTauri } from './tauri'

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
type LogData = Record<string, unknown>

let tauriLogPluginPromise: Promise<typeof import('@tauri-apps/plugin-log')> | null = null

function getTauriLogPlugin() {
  if (!tauriLogPluginPromise) {
    tauriLogPluginPromise = import('@tauri-apps/plugin-log').catch((err) => {
      tauriLogPluginPromise = null
      throw err
    })
  }
  return tauriLogPluginPromise
}

function formatMessage(message: string, data?: LogData): string {
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

function createLogMethod<T extends string | Error = string>(level: LogLevel) {
  return async (message: T, data?: LogData): Promise<void> => {
    const text = message instanceof Error ? (message.stack || message.message) : message
    if (isTauri()) {
      const logPlugin = await getTauriLogPlugin()
      await logPlugin[level](formatMessage(text, data))
    }
    else {
      // eslint-disable-next-line no-console
      console[level](text, data ?? '')
    }
  }
}

/**
 * 前端统一桌面日志管理器
 * 在 Tauri 环境下写入本地滚动日志文件与标准输出，在 Web 浏览器环境下输出至控制台
 */
export const logger = {
  trace: createLogMethod('trace'),
  debug: createLogMethod('debug'),
  info: createLogMethod('info'),
  warn: createLogMethod('warn'),
  error: createLogMethod<string | Error>('error'),
}
