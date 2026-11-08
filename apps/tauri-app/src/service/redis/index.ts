import type { RedisTrafficRecorder } from './devtools'
import type { RedisTransport } from './transport'
import type {
  RedisConnectionState,
  RedisError,
  RedisFlatResponse,
  RedisIncomingMessage,
  RedisOutgoingMessage,
  RedisRequestOptions,
  RedisResponseMessage,
  RedisTopicName,
  RedisTopicPayloads,
} from './types'
import { readonly, ref } from 'vue'
import { logger } from '../../plugins/logger'
import { createTrafficRecorder } from './devtools'
import { createDefaultTransport } from './transport'

const DEFAULT_TIMEOUT = 10_000

interface PendingRequest {
  resolve: (result: RedisFlatResponse<unknown>) => void
  timer: ReturnType<typeof setTimeout>
  silent: boolean
}

type TopicHandler = (data: unknown) => void

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Redis 通道客户端
 * - request：基于 requestId 的请求-响应（RPC），带超时控制，返回扁平结构 { data, error }
 * - subscribe：按主题分发后端推送
 * - state：响应式连接状态
 */
export class RedisClient {
  private readonly pending = new Map<string, PendingRequest>()
  private readonly topicHandlers = new Map<string, Set<TopicHandler>>()
  private readonly stateRef = ref<RedisConnectionState>('idle')
  private initPromise: Promise<void> | null = null
  private unlisteners: Array<() => void> = []

  /** 只读连接状态 */
  readonly state = readonly(this.stateRef)

  constructor(
    private readonly transport: RedisTransport,
    private readonly recorder?: RedisTrafficRecorder,
  ) {}

  /** 注册底层监听（幂等，首次使用时自动调用） */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = Promise.all([
        this.transport.onMessage(message => this.handleMessage(message)),
        this.transport.onState(state => this.handleState(state)),
      ])
        .then((unlisteners) => {
          this.unlisteners = unlisteners
        })
        .catch((err) => {
          this.initPromise = null
          throw err
        })
    }
    return this.initPromise
  }

  /** 发起请求并等待对应 requestId 的响应 */
  async request<T = unknown, P = unknown>(
    method: string,
    params: P,
    options: RedisRequestOptions = {},
  ): Promise<RedisFlatResponse<T>> {
    const { timeout = DEFAULT_TIMEOUT, silent = false } = options

    const message: RedisOutgoingMessage<P> = {
      requestId: createRequestId(),
      method,
      params,
      timestamp: Date.now(),
    }
    const { requestId } = message

    const result = new Promise<RedisFlatResponse<unknown>>((resolve) => {
      const timer = setTimeout(() => {
        this.settle(requestId, this.fail({ type: 'TIMEOUT', message: `请求超时：${method}` }, silent))
      }, timeout)
      this.pending.set(requestId, { resolve, timer, silent })
    })
    this.recorder?.onRequest(message)

    try {
      await this.init()
    }
    catch (err) {
      this.settle(requestId, this.fail({ type: 'TRANSPORT', message: String(err) }, silent))
      return result as Promise<RedisFlatResponse<T>>
    }

    if (this.stateRef.value === 'disconnected') {
      this.settle(requestId, this.fail({ type: 'DISCONNECTED', message: 'Redis 通道未连接' }, silent))
      return result as Promise<RedisFlatResponse<T>>
    }

    try {
      await this.transport.send(message)
    }
    catch (err) {
      this.settle(requestId, this.fail({ type: 'TRANSPORT', message: err instanceof Error ? err.message : String(err) }, silent))
    }

    return result as Promise<RedisFlatResponse<T>>
  }

  /** 订阅推送主题，返回取消订阅函数 */
  subscribe<K extends RedisTopicName>(topic: K, handler: (data: RedisTopicPayloads[K]) => void): () => void {
    this.init().catch(err => logger.error(`Redis 通道初始化失败: ${String(err)}`))

    let handlers = this.topicHandlers.get(topic)
    if (!handlers) {
      handlers = new Set()
      this.topicHandlers.set(topic, handlers)
    }
    const wrapped = handler as TopicHandler
    handlers.add(wrapped)

    return () => {
      handlers.delete(wrapped)
      if (handlers.size === 0) {
        this.topicHandlers.delete(topic)
      }
    }
  }

  /** 释放所有监听与挂起请求 */
  dispose(): void {
    this.unlisteners.forEach(unlisten => unlisten())
    this.unlisteners = []
    this.initPromise = null
    this.rejectAllPending('Redis 客户端已释放')
    this.topicHandlers.clear()
  }

  private handleMessage(message: RedisIncomingMessage): void {
    if (message.kind === 'response') {
      this.handleResponse(message)
      return
    }

    this.recorder?.onPush(message)
    const handlers = this.topicHandlers.get(message.topic)
    handlers?.forEach((handler) => {
      try {
        handler(message.data)
      }
      catch (err) {
        logger.error(`Redis 推送处理异常 [${message.topic}]: ${String(err)}`)
      }
    })
  }

  private handleResponse(message: RedisResponseMessage): void {
    const pending = this.pending.get(message.requestId)
    // 不属于本窗口的响应（多窗口共享事件）直接忽略
    if (!pending)
      return

    if (String(message.code) === import.meta.env.VITE_SERVICE_SUCCESS_CODE) {
      this.settle(message.requestId, { data: message.data, error: null })
    }
    else {
      this.settle(
        message.requestId,
        this.fail({ type: 'BACKEND', code: String(message.code), message: message.msg }, pending.silent),
      )
    }
  }

  private handleState(state: RedisConnectionState): void {
    this.stateRef.value = state
    if (state === 'disconnected') {
      this.rejectAllPending('Redis 通道已断开')
    }
  }

  private settle(requestId: string, result: RedisFlatResponse<unknown>): void {
    const pending = this.pending.get(requestId)
    if (!pending)
      return
    clearTimeout(pending.timer)
    this.pending.delete(requestId)
    this.recorder?.onSettle(requestId, result)
    pending.resolve(result)
  }

  private rejectAllPending(message: string): void {
    for (const [requestId, pending] of this.pending) {
      this.settle(requestId, this.fail({ type: 'DISCONNECTED', message }, pending.silent))
    }
  }

  private fail(error: RedisError, silent: boolean): RedisFlatResponse<never> {
    logger.warn(`Redis 请求失败 [${error.type}] ${error.message}`)
    if (!silent) {
      window.$message?.error(error.message)
    }
    return { data: null, error }
  }
}

export const redisClient = new RedisClient(createDefaultTransport(), createTrafficRecorder())

export * from './types'
export { useRedisTopic } from './use-redis-topic'
