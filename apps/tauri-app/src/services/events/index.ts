import type { AppEventName, AppEventPayloads } from './types'
import { onUnmounted } from 'vue'
import { isTauri } from '../../plugins/tauri'

let webBroadcastChannel: BroadcastChannel | null = null

function getWebBroadcastChannel(): BroadcastChannel | null {
  if (!webBroadcastChannel && typeof BroadcastChannel !== 'undefined') {
    webBroadcastChannel = new BroadcastChannel('soybean_desktop_events')
  }
  return webBroadcastChannel
}

/**
 * 广播跨窗口事件
 * 在 Tauri 环境下调用原生系统总线广播至全部窗口，在 Web 浏览器环境下通过 BroadcastChannel 跨 Tab 广播
 */
export async function emitAppEvent<K extends AppEventName>(
  eventName: K,
  payload: AppEventPayloads[K],
): Promise<void> {
  if (isTauri()) {
    const { emit } = await import('@tauri-apps/api/event')
    await emit(eventName, payload)
    return
  }

  const channel = getWebBroadcastChannel()
  if (channel) {
    channel.postMessage({ eventName, payload })
  }
}

/**
 * Vue 组合式 Hook：监听跨窗口事件
 * 自动在组件挂载生命周期注册，并在组件卸载 (onUnmounted) 时自动注销监听器，杜绝内存泄漏
 */
export function useAppEventListener<K extends AppEventName>(
  eventName: K,
  handler: (payload: AppEventPayloads[K]) => void,
): void {
  let isDisposed = false
  let unlistenFn: (() => void) | null = null

  if (isTauri()) {
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        if (isDisposed)
          return
        return listen<AppEventPayloads[K]>(eventName, (event) => {
          handler(event.payload)
        }).then((dispose) => {
          if (isDisposed) {
            dispose()
          }
          else {
            unlistenFn = dispose
          }
        })
      })
      .catch(() => {})
  }
  else {
    const channel = getWebBroadcastChannel()
    if (channel) {
      const messageListener = (ev: MessageEvent) => {
        if (ev.data?.eventName === eventName) {
          handler(ev.data.payload)
        }
      }
      channel.addEventListener('message', messageListener)
      unlistenFn = () => channel.removeEventListener('message', messageListener)
    }
  }

  onUnmounted(() => {
    isDisposed = true
    if (unlistenFn) {
      unlistenFn()
      unlistenFn = null
    }
  })
}

export * from './types'
