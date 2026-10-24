/**
 * 跨窗口事件总线支持的事件名称与 Payload 类型定义
 */
export interface AppEventPayloads {
  /** 打开设置抽屉 */
  'open-settings': void
  /** 退出登录广播 */
  'auth:logout': void
  /** 主题模式变更广播 */
  'theme:change': boolean
  /** 语言环境变更广播 */
  'locale:change': App.I18n.LangType
  /** 跨窗口通用消息通信 */
  'window:message': { from: string, content: string }
  /** 实体数据变更通知，触发其他窗口静默刷新 */
  'data:refresh': { entity: string, id?: string | number }
}

export type AppEventName = keyof AppEventPayloads
