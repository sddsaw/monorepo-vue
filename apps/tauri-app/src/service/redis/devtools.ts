import type {
  RedisDevtoolsRow,
  RedisFlatResponse,
  RedisOutgoingMessage,
  RedisPushMessage,
} from './types'
import { logger } from '../../plugins/logger'
import { getCurrentWindowLabel } from '../../plugins/tauri'
import { emitAppEvent, listenAppEvent } from '../../services/events'

/** 流量记录器：由 RedisClient 在收发节点调用 */
export interface RedisTrafficRecorder {
  onRequest: (message: RedisOutgoingMessage) => void
  onSettle: (requestId: string, result: RedisFlatResponse<unknown>) => void
  onPush: (message: RedisPushMessage) => void
}

/** 每个窗口最多保留的记录条数，超出丢弃最早的 */
const MAX_ROWS = 1000

/**
 * 开发模式记录器：记录完整收发内容并广播给调试面板窗口
 *
 * TODO: Rust 侧完成后，数据源改为 Rust emit 的 `redis://devtools` 事件（可看到全部窗口的真实流量），面板 UI 无需改动
 */
function createDevRecorder(): RedisTrafficRecorder {
  const rows = new Map<string, RedisDevtoolsRow>()
  let source = 'main'
  let pushSeq = 0

  getCurrentWindowLabel().then((label) => {
    source = label
  })

  // 调试面板打开时请求历史记录
  listenAppEvent('redis-devtools:sync', () => {
    void emitAppEvent('redis-devtools:snapshot', { source, rows: [...rows.values()] })
  }).catch(() => {})

  function upsert(row: RedisDevtoolsRow) {
    rows.delete(row.key)
    rows.set(row.key, row)
    if (rows.size > MAX_ROWS) {
      const oldestKey = rows.keys().next().value
      if (oldestKey !== undefined)
        rows.delete(oldestKey)
    }
    void emitAppEvent('redis-devtools:row', row)
  }

  return {
    onRequest(message) {
      upsert({
        key: message.requestId,
        kind: 'rpc',
        name: message.method,
        source,
        status: 'pending',
        startedAt: message.timestamp,
        request: message.params,
      })
    },
    onSettle(requestId, result) {
      const row = rows.get(requestId)
      if (!row)
        return
      upsert({
        ...row,
        status: result.error ? 'error' : 'success',
        duration: Date.now() - row.startedAt,
        response: result.data ?? undefined,
        error: result.error ?? undefined,
      })
    },
    onPush(message) {
      pushSeq += 1
      upsert({
        key: `push-${Date.now()}-${pushSeq}`,
        kind: 'push',
        name: message.topic,
        source,
        status: 'success',
        startedAt: Date.now(),
        response: message.data,
      })
    },
  }
}

/**
 * 生产模式记录器：只写摘要到日志文件（不含参数与返回数据，避免敏感信息落盘）
 * 失败详情已由 RedisClient 以 warn 级别记录
 */
function createProdRecorder(): RedisTrafficRecorder {
  const pending = new Map<string, { method: string, startedAt: number }>()

  return {
    onRequest(message) {
      pending.set(message.requestId, { method: message.method, startedAt: message.timestamp })
    },
    onSettle(requestId, result) {
      const item = pending.get(requestId)
      if (!item)
        return
      pending.delete(requestId)
      const status = result.error ? `${result.error.type}${result.error.code ? `:${result.error.code}` : ''}` : 'OK'
      void logger.info(`[redis] ${item.method} ${requestId} ${Date.now() - item.startedAt}ms ${status}`)
    },
    onPush() {},
  }
}

export function createTrafficRecorder(): RedisTrafficRecorder {
  return import.meta.env.DEV ? createDevRecorder() : createProdRecorder()
}
