<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  fileName?: string
  activeNodeLabel?: string
  componentKey?: string
  dataPath?: (string | number)[]
}>()

const formattedPath = computed(() => {
  if (!props.dataPath || props.dataPath.length === 0)
    return ''
  return props.dataPath.join(' › ')
})

function copyLocation() {
  const loc = `${props.fileName || ''} > ${formattedPath.value} [${props.componentKey || ''}.vue]`
  navigator.clipboard.writeText(loc)
  window.$message?.success?.('坐标路径已复制')
}
</script>

<template>
  <div class="h-26px flex items-center justify-between px-3 text-xs bg-[#1e1e1e] border-b border-[#2d2d2d] text-gray-400 select-none">
    <div class="flex items-center gap-1.5 overflow-hidden truncate">
      <!-- 文件名 -->
      <span class="flex items-center gap-1 text-gray-300 font-medium shrink-0">
        <SvgIcon icon="ri:file-code-line" class="text-13px text-blue-400" />
        {{ fileName || '未加载文件' }}
      </span>

      <span v-if="formattedPath" class="text-gray-600">›</span>

      <!-- 数据路径 -->
      <span v-if="formattedPath" class="text-gray-400 truncate font-mono text-11px">
        {{ formattedPath }}
      </span>

      <span v-if="activeNodeLabel" class="text-gray-600">›</span>

      <!-- 测试项名称 -->
      <span v-if="activeNodeLabel" class="text-yellow-400/90 font-medium shrink-0">
        {{ activeNodeLabel }}
      </span>
    </div>

    <!-- 右侧：当前渲染的组件名标签 + 快速复制定位 -->
    <div class="flex items-center gap-2 shrink-0">
      <span v-if="componentKey" class="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 font-mono text-10px">
        {{ componentKey }}.vue
      </span>
      <button
        type="button"
        @click="copyLocation"
        class="text-11px text-gray-500 hover:text-gray-200 transition-colors cursor-pointer"
        title="复制完整定位路径"
      >
        📋 复制坐标
      </button>
    </div>
  </div>
</template>
