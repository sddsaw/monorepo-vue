import type { Directive } from 'vue'
import { trackEvent } from '@sa/utils'

interface TrackBindingValueObject {
  /** 事件名称 */
  name: string
  /** 自定义上报参数数据 */
  data?: Record<string, unknown>
}

type TrackBindingValue = string | TrackBindingValueObject

/**
 * Vue 3 声明式埋点指令 v-track
 *
 * 语法说明:
 * 1. 基础用法 (默认监听 click 事件):
 *    <button v-track="'click-payment-btn'">购买</button>
 *
 * 2. 传递参数用法:
 *    <button v-track="{ name: 'click-payment-btn', data: { price: 99 } }">购买</button>
 *
 * 3. 监听其他事件用法 (如: focus, mouseenter):
 *    <input v-track:focus="'input-focused'" />
 */
export const vTrack: Directive<HTMLElement, TrackBindingValue> = {
  mounted(el, binding) {
    const eventType = binding.arg || 'click'
    const value = binding.value

    if (!value)
      return

    el.addEventListener(eventType, () => {
      if (typeof value === 'string') {
        trackEvent(value)
      }
      else if (typeof value === 'object' && value.name) {
        trackEvent(value.name, value.data)
      }
    })
  },
}
