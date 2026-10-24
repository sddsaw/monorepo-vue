/**
 * @file analytics.ts
 * @description 用户行为埋点与数据统计分析工具箱 (基于 Umami)
 *
 * 主要功能:
 * 1. 动态挂载 Umami 统计脚本 (仅在生产环境)
 * 2. 运行时手动上报自定义事件与页面视图 (trackEvent, trackPageView)
 * 3. Vue 3 声明式埋点指令 (v-track)
 */

interface UmamiEventPayload {
  /** 自定义事件的数据负载对象 */
  [key: string]: any
}

interface UmamiTrackPayload {
  /** 网站 ID */
  websiteId?: string
  /** 自定义上报的页面 URL */
  url?: string
  /** 页面标题 */
  title?: string
  /** 来源页面 */
  referrer?: string
}

interface UmamiTracker {
  /**
   * 上报自定义事件
   * @param eventName 事件名称
   * @param eventData 自定义参数 (可选)
   */
  track: ((eventName: string, eventData?: UmamiEventPayload) => void) & ((payload: UmamiTrackPayload) => void)
}

/**
 * 安全上报自定义事件至 Umami 分析平台
 * 支持安全过滤（广告拦截、本地开发环境等）
 *
 * @param eventName 事件名称
 * @param eventData 自定义数据负载 (可选)
 */
export function trackEvent(eventName: string, eventData?: UmamiEventPayload) {
  if (typeof window === 'undefined')
    return

  const tracker = (window as any).umami as UmamiTracker | undefined

  if (tracker && typeof tracker.track === 'function') {
    tracker.track(eventName, eventData)
  }
  else if (import.meta.env.DEV) {
    // 开发环境下输出友好的提示日志，便于调试埋点逻辑
    // eslint-disable-next-line no-console
    console.log(`[Umami Analytics] 📊 Event Tracked: "${eventName}"`, eventData ?? '')
  }
}

/**
 * 手动上报自定义页面视图 (通常用于复杂的路由模式或手动 PV 控制)
 *
 * @param url 自定义页面路由地址 (例如: '/custom-page')
 * @param referrer 来源页面地址 (可选)
 * @param websiteId 绑定的 Website ID (可选)
 */
export function trackPageView(url: string, referrer?: string, websiteId?: string) {
  if (typeof window === 'undefined')
    return

  const tracker = (window as any).umami as UmamiTracker | undefined

  if (tracker && typeof tracker.track === 'function') {
    tracker.track({
      url,
      referrer,
      websiteId,
    })
  }
  else if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[Umami Analytics] 🖥️ PageView Tracked: "${url}" (Referrer: "${referrer ?? 'Direct'}")`)
  }
}

/**
 * 初始化 Umami 统计脚本 (仅在生产环境下动态挂载)
 * @param options 初始化选项
 * @param options.websiteId 网站 ID
 * @param options.scriptUrl 统计脚本 URL (默认: 'https://cloud.umami.is/script.js')
 */
export function initUmami(options: {
  /** 网站 ID */
  websiteId: string
  /** 统计脚本脚本 URL (默认: 'https://cloud.umami.is/script.js') */
  scriptUrl?: string
}) {
  if (typeof window === 'undefined')
    return

  // 只有在生产环境且配置了 websiteId 时才动态插入脚本
  if (import.meta.env.PROD && options.websiteId) {
    const scriptUrl = options.scriptUrl || 'https://cloud.umami.is/script.js'
    const script = document.createElement('script')
    script.defer = true
    script.src = scriptUrl
    script.setAttribute('data-website-id', options.websiteId)
    document.head.appendChild(script)
  }
}
