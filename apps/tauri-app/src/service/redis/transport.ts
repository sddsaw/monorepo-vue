import type { RedisConnectionState, RedisIncomingMessage, RedisOutgoingMessage } from './types'
import { isTauri } from '../../plugins/tauri'
import { REDIS_IPC } from './types'

type Unlisten = () => void

/** 传输层抽象：屏蔽 Tauri IPC 与 Web 环境差异，便于后续替换为 Mock */
export interface RedisTransport {
  send: (message: RedisOutgoingMessage) => Promise<void>
  onMessage: (handler: (message: RedisIncomingMessage) => void) => Promise<Unlisten>
  onState: (handler: (state: RedisConnectionState) => void) => Promise<Unlisten>
}

/**
 * Tauri 传输：通过 Rust 侧 Redis 连接收发
 *
 * TODO: Rust 侧尚未实现 `redis_send` 命令与 `redis://*` 事件，详见根目录 TODO.md 第 23 项
 */
export function createTauriTransport(): RedisTransport {
  return {
    async send(message) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke(REDIS_IPC.sendCommand, { message })
    },
    async onMessage(handler) {
      const { listen } = await import('@tauri-apps/api/event')
      return listen<RedisIncomingMessage>(REDIS_IPC.messageEvent, event => handler(event.payload))
    },
    async onState(handler) {
      const { listen } = await import('@tauri-apps/api/event')
      return listen<RedisConnectionState>(REDIS_IPC.stateEvent, event => handler(event.payload))
    },
  }
}

/** Web 传输：浏览器环境无法连接 Redis，统一报告断开状态 */
export function createWebTransport(): RedisTransport {
  return {
    async send() {
      throw new Error('[Web 模拟] 浏览器环境不支持 Redis 通道')
    },
    async onMessage() {
      return () => {}
    },
    async onState(handler) {
      handler('disconnected')
      return () => {}
    },
  }
}

export function createDefaultTransport(): RedisTransport {
  return isTauri() ? createTauriTransport() : createWebTransport()
}
