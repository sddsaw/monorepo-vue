import type { App } from 'vue'
import type { Router } from 'vue-router'
import * as Sentry from '@sentry/vue'

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
  sentryConfig?: Partial<Parameters<typeof Sentry.init>[0]>
}

/**
 * 初始化 Sentry 错误与性能监控
 * @param app Vue 实例
 * @param router Vue Router 实例
 * @param options 配置参数
 */
export function initSentry(app: App, router: Router, options: SentryOptions) {
  const { dsn, environment, release, enableReplay, sentryConfig } = options

  // 1. 无 DSN 或处于本地开发环境，则不启用监控
  if (!dsn || ['local', 'development'].includes(environment)) {
    return
  }

  // 2. 组装插件列表并过滤掉空值，保持类型安全
  const integrations = [
    router ? Sentry.browserTracingIntegration({ router }) : undefined,
    enableReplay ? Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }) : undefined,
  ].filter((i): i is NonNullable<typeof i> => !!i)

  // 3. 开启 Sentry 监控
  Sentry.init({
    app,
    dsn,
    environment,
    release,
    integrations,
    // 默认性能采样率：生产环境 20%，非开发环境的测试/预发环境 100%
    tracesSampleRate: environment === 'prod' ? 0.2 : 1.0,
    // 默认录屏采样率：正常会话录 10%，发生错误时 100% 录制
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // 合并用户传入的额外原生配置以提供极高灵活性
    ...sentryConfig,
  })
}

/**
 * 封装后的 Sentry 手动上报工具箱，隔离子应用对底层 SDK 的直接依赖
 */
export const sentryLogger = {
  /** 手动上报捕获的异常 */
  captureException: Sentry.captureException,
  /** 手动上报自定义消息 */
  captureMessage: Sentry.captureMessage,
  /** 添加用户行为面包屑追踪 */
  addBreadcrumb: Sentry.addBreadcrumb,
}
