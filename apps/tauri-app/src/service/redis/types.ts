/**
 * Redis 通道传输协议契约
 *
 * 前端 <-> Rust 的 IPC 约定（Rust 侧需按此实现）：
 * - 命令 `redis_send`：前端调用 invoke('redis_send', { message: RedisOutgoingMessage })，由 Rust 投递给后端
 * - 事件 `redis://message`：Rust 收到后端消息后 emit，payload 为 RedisIncomingMessage
 * - 事件 `redis://state`：Rust 连接状态变化时 emit，payload 为 RedisConnectionState
 */

/** IPC 命令与事件名称 */
export const REDIS_IPC = {
  sendCommand: 'redis_send',
  messageEvent: 'redis://message',
  stateEvent: 'redis://state',
} as const

/** 连接状态 */
export type RedisConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

/** 前端 -> 后端：请求消息 */
export interface RedisOutgoingMessage<P = unknown> {
  /** 请求唯一标识，用于匹配响应 */
  requestId: string
  /** 业务方法名，例如 `device:control` */
  method: string
  /** 请求参数 */
  params: P
  /** 发送时间戳（毫秒） */
  timestamp: number
}

/** 后端 -> 前端：请求的响应 */
export interface RedisResponseMessage<T = unknown> {
  kind: 'response'
  /** 对应请求的 requestId */
  requestId: string
  /** 业务状态码，与 HTTP 通道共用 `VITE_SERVICE_SUCCESS_CODE` 判定成功 */
  code: string
  msg: string
  data: T
}

/** 后端 -> 前端：主动推送 */
export interface RedisPushMessage<T = unknown> {
  kind: 'push'
  /** 推送主题，例如 `device:status` */
  topic: string
  data: T
}

export type RedisIncomingMessage = RedisResponseMessage | RedisPushMessage

/** 错误类型 */
export type RedisErrorType = 'TIMEOUT' | 'BACKEND' | 'TRANSPORT' | 'DISCONNECTED'

export interface RedisError {
  type: RedisErrorType
  /** 后端业务码（仅 BACKEND 类型存在） */
  code?: string
  message: string
}

/** 扁平化返回结构，与 HTTP 通道 `createFlatRequest` 保持一致 */
export type RedisFlatResponse<T>
  = | { data: T, error: null }
    | { data: null, error: RedisError }

/** 单次请求选项 */
export interface RedisRequestOptions {
  /** 超时时间（毫秒），默认 10000 */
  timeout?: number
  /** 失败时不弹出全局错误提示 */
  silent?: boolean
}

/**
 * 推送主题与 Payload 类型映射
 * 新增推送主题时在此声明，`useRedisTopic` 会据此自动推导类型
 */
export interface RedisTopicPayloads {
  /** 示例：设备状态变更 */
  'device:status': Api.Device.DeviceStatus
}

export type RedisTopicName = keyof RedisTopicPayloads

/** 调试面板：单条流量记录（RPC 请求与响应合并为一条，推送单独一条） */
export interface RedisDevtoolsRow {
  /** 唯一键：RPC 为 requestId，推送为自动生成 id */
  key: string
  kind: 'rpc' | 'push'
  /** RPC 为 method，推送为 topic */
  name: string
  /** 产生该流量的窗口标识 */
  source: string
  status: 'pending' | 'success' | 'error'
  startedAt: number
  /** RPC 耗时（毫秒） */
  duration?: number
  request?: unknown
  response?: unknown
  error?: RedisError
}

/** 调试面板快照 */
export interface RedisDevtoolsSnapshot {
  source: string
  rows: RedisDevtoolsRow[]
}

/** 调试面板重放请求 */
export interface RedisDevtoolsReplay {
  method: string
  params: unknown
}
