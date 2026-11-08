import type { RedisTopicName, RedisTopicPayloads } from './types'
import { getCurrentScope, onScopeDispose } from 'vue'
import { redisClient } from './index'

/**
 * Vue 组合式 Hook：订阅 Redis 推送主题
 * 在组件 setup / Pinia setup store / effectScope 中调用时，作用域销毁会自动取消订阅，杜绝重复监听与内存泄漏
 *
 * @returns 手动取消订阅函数
 */
export function useRedisTopic<K extends RedisTopicName>(
  topic: K,
  handler: (data: RedisTopicPayloads[K]) => void,
): () => void {
  const unsubscribe = redisClient.subscribe(topic, handler)

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  return unsubscribe
}
