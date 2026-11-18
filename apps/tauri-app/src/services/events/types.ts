/**
 * 跨窗口事件总线支持的事件名称与 Payload 类型定义
 */
export interface AppEventPayloads {
  /** 打开设置抽屉 */
  'open-settings': void
  /** 退出登录广播 */
  'auth:logout': void
  /** 全局主题配置同步（所有窗口使用同一主色和明暗模式） */
  'theme:settings': { settings: App.Theme.ThemeSetting, overrides?: App.Theme.NaiveUIThemeOverride }
  /** 语言环境变更广播 */
  'locale:change': App.I18n.LangType
  /** 跨窗口通用消息通信 */
  'window:message': { from: string, content: string }
  /** 实体数据变更通知，触发其他窗口静默刷新 */
  'data:refresh': { entity: string, id?: string | number }
  /** Redis 调试面板：打开面板（由原生菜单触发） */
  'redis-devtools:open': void
  /** Redis 调试面板：单条流量新增/更新 */
  'redis-devtools:row': import('@/service/redis/types').RedisDevtoolsRow
  /** Redis 调试面板：请求各窗口回传历史记录 */
  'redis-devtools:sync': void
  /** Redis 调试面板：历史记录快照 */
  'redis-devtools:snapshot': import('@/service/redis/types').RedisDevtoolsSnapshot
  /** Redis 调试面板：重放请求（由主窗口执行） */
  'redis-devtools:replay': import('@/service/redis/types').RedisDevtoolsReplay
}

export type AppEventName = keyof AppEventPayloads
