<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'

const props = defineProps<{
  nodeId?: string
  nodeLabel?: string
  componentKey?: string
  fileName?: string
  dataPath?: (string | number)[]
  rawData?: any
}>()

const errorInfo = ref<{
  message: string
  stack: string
  componentName: string
  lifecycleHook: string
} | null>(null)

// 节点切换时自动清空历史错误状态
watch(
  () => props.nodeId,
  () => {
    errorInfo.value = null
  },
)

// 捕获子孙业务组件内的渲染/生命周期/事件异常
onErrorCaptured((err: any, instance: any, info: string) => {
  errorInfo.value = {
    message: err?.message || String(err),
    stack: err?.stack || '',
    componentName: instance?.$options?.__name || instance?.type?.__name || props.componentKey || 'UnknownComponent',
    lifecycleHook: info,
  }
  // 返回 false 彻底阻断错误冒泡，防止整个桌面应用白屏崩溃！
  return false
})

/** 一键复制排障包发给研发 */
function copyDiagnosticReport() {
  const report = {
    timestamp: new Date().toISOString(),
    virtualRoute: `ate://workbench/${props.componentKey || 'Unknown'}?file=${props.fileName || ''}&node=${props.nodeId || ''}`,
    componentFile: `${errorInfo.value?.componentName}.vue`,
    lifecycleHook: errorInfo.value?.lifecycleHook,
    dataPath: props.dataPath ? props.dataPath.join('.') : 'root',
    rawDataSnapshot: props.rawData,
    errorMessage: errorInfo.value?.message,
    errorStack: errorInfo.value?.stack,
  }

  navigator.clipboard.writeText(JSON.stringify(report, null, 2))
  window.$message?.success?.('排障诊断报告已复制到剪贴板！')
}
</script>

<template>
  <div v-if="errorInfo" class="p-6 bg-red-950/40 border border-red-500/60 rounded-lg text-sm m-4 select-text">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-xl">⚠️</span>
        <h3 class="text-red-400 font-bold text-base">业务组件渲染异常 (已就地隔离，工作台正常运行)</h3>
      </div>
      <button
        type="button"
        @click="copyDiagnosticReport"
        class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium cursor-pointer transition-colors"
      >
        📋 一键复制排障报告发给研发
      </button>
    </div>

    <!-- 研发最关心的定位坐标 -->
    <div class="grid grid-cols-2 gap-2 bg-black/50 p-3 rounded font-mono text-xs mb-3 border border-red-900/50">
      <div>
        <strong class="text-gray-400">组件标识:</strong>
        <span class="text-yellow-400 ml-1">{{ errorInfo.componentName }}.vue</span>
      </div>
      <div>
        <strong class="text-gray-400">所属文件:</strong>
        <span class="text-gray-200 ml-1">{{ fileName || '未知文件' }}</span>
      </div>
      <div>
        <strong class="text-gray-400">测试项路径:</strong>
        <span class="text-blue-300 ml-1">$.{{ dataPath ? dataPath.join('.') : 'root' }}</span>
      </div>
      <div>
        <strong class="text-gray-400">触发位置:</strong>
        <span class="text-red-300 ml-1">{{ errorInfo.lifecycleHook }}</span>
      </div>
    </div>

    <!-- 堆栈 -->
    <div class="mb-3">
      <div class="text-xs text-gray-400 mb-1">错误堆栈详情:</div>
      <pre class="bg-black/70 p-3 rounded text-red-300 overflow-auto max-h-36 text-xs font-mono">{{ errorInfo.stack || errorInfo.message }}</pre>
    </div>

    <!-- 传入该组件的原始数据切片 -->
    <details class="cursor-pointer">
      <summary class="text-xs text-gray-300 hover:text-white">查看当前节点传入的数据快照 (rawData)</summary>
      <pre class="bg-black/70 p-3 mt-2 rounded text-green-300 overflow-auto max-h-48 text-xs font-mono">{{ JSON.stringify(rawData, null, 2) }}</pre>
    </details>
  </div>

  <slot v-else />
</template>
