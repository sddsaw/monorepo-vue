import { type Component, defineAsyncComponent } from 'vue'

/**
 * 方式 A：显式业务组件字典
 * 键名为 JSON 节点声明的 componentKey 或 testType
 * 采用 defineAsyncComponent 实现异步拆包懒加载，保证主包极小、首屏极快
 */
export const TP_COMPONENTS = {
  // ─── 测试流与测试项 (TestFlow) ──────────────────────────
  SuiteSummary: defineAsyncComponent(() => import('@/views/workbench/components/business/test-flow/SuiteSummary.vue')),
  Continuity: defineAsyncComponent(() => import('@/views/workbench/components/business/test-flow/ContinuityEditor.vue')),
  IDDQ: defineAsyncComponent(() => import('@/views/workbench/components/business/test-flow/IddqEditor.vue')),
  PMU_Force: defineAsyncComponent(() => import('@/views/workbench/components/business/test-flow/PmuForceEditor.vue')),

  // ─── 管脚定义 (PinMap) ──────────────────────────────────
  PinTable: defineAsyncComponent(() => import('@/views/workbench/components/business/pin-map/PinTableEditor.vue')),

  // ─── 直流电平参数 (Levels) ──────────────────────────────
  SpecTable: defineAsyncComponent(() => import('@/views/workbench/components/business/levels/SpecTableEditor.vue')),
} as const

/** 业务组件键名强类型联合，用于编译期类型守卫 */
export type TPComponentKey = keyof typeof TP_COMPONENTS

/**
 * 安全获取已注册业务组件
 * @param key 业务组件键名
 * @returns Vue 组件构造器或 undefined
 */
export function getBusinessComponent(key: string): Component | undefined {
  if (key in TP_COMPONENTS) {
    return TP_COMPONENTS[key as TPComponentKey]
  }
  return undefined
}
