import { redisClient } from '../service/redis'
import { listenAppEvent } from '../services/events'
import { openNewWindow } from '../services/ipc'
import { logger } from './logger'

export const REDIS_DEVTOOLS_LABEL = 'redis-devtools'

let initialized = false

/** 打开（或聚焦）Redis 调试面板窗口 */
export async function openRedisDevtools(): Promise<void> {
  try {
    await openNewWindow({
      label: REDIS_DEVTOOLS_LABEL,
      title: 'Redis 调试面板',
      url: 'index.html#/redis-devtools',
      width: 1100,
      height: 680,
    })
  }
  catch (err) {
    logger.warn(`打开 Redis 调试面板失败: ${String(err)}`)
  }
}

/**
 * 初始化 Redis 调试面板（仅开发模式 + 主窗口调用）
 * - macOS 原生菜单「视图 → Redis 调试面板」打开
 * - `VITE_REDIS_DEVTOOLS_AUTO_OPEN=Y` 时启动自动打开
 * - 执行面板发起的重放请求
 */
export function setupRedisDevtools(): void {
  if (!import.meta.env.DEV || initialized)
    return
  initialized = true

  listenAppEvent('redis-devtools:open', () => {
    void openRedisDevtools()
  }).catch(() => {})

  listenAppEvent('redis-devtools:replay', ({ method, params }) => {
    void redisClient.request(method, params, { silent: true })
  }).catch(() => {})

  if (import.meta.env.VITE_REDIS_DEVTOOLS_AUTO_OPEN === 'Y') {
    void openRedisDevtools()
  }
}
