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
  <div v-if="errorInfo" class="m-4 select-text border border-red-500/60 rounded-lg bg-red-950/40 p-6 text-sm">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">⚠️</span>
        <h3 class="text-base text-red-400 font-bold">
          业务组件渲染异常 (已就地隔离，工作台正常运行)
        </h3>
      </div>
      <button
        type="button"
        class="cursor-pointer rounded bg-red-600 px-3 py-1.5 text-xs text-white font-medium transition-colors hover:bg-red-500"
        @click="copyDiagnosticReport"
      >
        📋 一键复制排障报告发给研发
      </button>
    </div>

    <!-- 研发最关心的定位坐标 -->
    <div class="grid grid-cols-2 mb-3 gap-2 border border-red-900/50 rounded bg-black/50 p-3 text-xs font-mono">
      <div>
        <strong class="text-gray-400">组件标识:</strong>
        <span class="ml-1 text-yellow-400">{{ errorInfo.componentName }}.vue</span>
      </div>
      <div>
        <strong class="text-gray-400">所属文件:</strong>
        <span class="ml-1 text-gray-200">{{ fileName || '未知文件' }}</span>
      </div>
      <div>
        <strong class="text-gray-400">测试项路径:</strong>
        <span class="ml-1 text-blue-300">$.{{ dataPath ? dataPath.join('.') : 'root' }}</span>
      </div>
      <div>
        <strong class="text-gray-400">触发位置:</strong>
        <span class="ml-1 text-red-300">{{ errorInfo.lifecycleHook }}</span>
      </div>
    </div>

    <!-- 堆栈 -->
    <div class="mb-3">
      <div class="mb-1 text-xs text-gray-400">
        错误堆栈详情:
      </div>
      <pre class="max-h-36 overflow-auto rounded bg-black/70 p-3 text-xs text-red-300 font-mono">{{ errorInfo.stack || errorInfo.message }}</pre>
    </div>

    <!-- 传入该组件的原始数据切片 -->
    <details class="cursor-pointer">
      <summary class="text-xs text-gray-300 hover:text-white">
        查看当前节点传入的数据快照 (rawData)
      </summary>
      <pre class="mt-2 max-h-48 overflow-auto rounded bg-black/70 p-3 text-xs text-green-300 font-mono">{{ JSON.stringify(rawData, null, 2) }}</pre>
    </details>
  </div>

  <slot v-else />
</template>
