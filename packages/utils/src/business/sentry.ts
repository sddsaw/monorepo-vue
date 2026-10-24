import type * as SentryType from '@sentry/vue'
import type { App } from 'vue'
import type { Router } from 'vue-router'

let sentryInstance: typeof SentryType | null = null

export interface SentryOptions {
  /** Sentry DSN 地址 */
  dsn: string
  /** 当前运行环境 (例如: 'development', 'production', 'test') */
  environment: string
  /** 版本号标识 (推荐使用构建时间戳或 Git Commit Hash) */
  release?: string
  /** 是否启用 Session Replay 录屏功能 (默认: false) */
  enableReplay?: boolean
  /** 额外的 Sentry 官方初始化配置项 */
  sentryConfig?: Partial<Parameters<typeof SentryType.init>[0]>
}

/**
 * 初始化 Sentry 错误与性能监控（按需异步动态加载）
 * @param app Vue 实例
 * @param router Vue Router 实例
 * @param options 配置参数
 */
export async function initSentry(app: App, router: Router, options: SentryOptions) {
  const { dsn, environment, release, enableReplay, sentryConfig } = options

  // 1. 无 DSN 或处于本地开发环境，则不启用监控，彻底不加载 Sentry SDK
  if (!dsn || ['local', 'development'].includes(environment)) {
    return
  }

  try {
    // 2. 动态异步加载 Sentry SDK，不污染主包
    const Sentry = await import('@sentry/vue')
    sentryInstance = Sentry

    // 3. 组装插件列表
    const integrations = [
      router ? Sentry.browserTracingIntegration({ router }) : undefined,
      enableReplay ? Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }) : undefined,
    ].filter((i): i is NonNullable<typeof i> => !!i)

    // 4. 开启 Sentry 监控
    Sentry.init({
      app,
      dsn,
      environment,
      release,
      integrations,
      tracesSampleRate: environment === 'prod' ? 0.2 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      ...sentryConfig,
    })
  }
  catch (error) {
    console.warn('[Sentry] 动态加载失败:', error)
  }
}

/**
 * 封装后的 Sentry 手动上报工具箱（软代理模式）
 */
export const sentryLogger = {
  /** 手动上报捕获的异常 */
  captureException(...args: Parameters<typeof SentryType.captureException>) {
    return sentryInstance?.captureException(...args)
  },
  /** 手动上报自定义消息 */
  captureMessage(...args: Parameters<typeof SentryType.captureMessage>) {
    return sentryInstance?.captureMessage(...args)
  },
  /** 添加用户行为面包屑追踪 */
  addBreadcrumb(...args: Parameters<typeof SentryType.addBreadcrumb>) {
    return sentryInstance?.addBreadcrumb(...args)
  },
}
