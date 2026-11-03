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
  <div
    :style="{
      backgroundColor: 'var(--wb-editor-bg, #1e1e1e)',
      borderColor: 'var(--wb-border-color, #2d2d2d)',
    }"
    class="h-26px flex select-none items-center justify-between border-b px-3 text-xs text-gray-400"
  >
    <div class="flex items-center gap-1.5 overflow-hidden truncate">
      <!-- 特殊处理系统首选项设置 Tab -->
      <template v-if="componentKey === 'SettingsView'">
        <span class="flex shrink-0 items-center gap-1 text-gray-300 font-medium">
          <SvgIcon icon="codicon:settings-gear" class="text-13px text-blue-400" />
          系统首选项
        </span>
        <span class="text-gray-600">›</span>
        <span class="shrink-0 text-yellow-400/90 font-medium">
          {{ activeNodeLabel || '首选项与设置' }}
        </span>
      </template>
      <template v-else>
        <!-- 文件名 -->
        <span class="flex shrink-0 items-center gap-1 text-gray-300 font-medium">
          <SvgIcon icon="ri:file-code-line" class="text-13px text-blue-400" />
          {{ fileName || '未加载文件' }}
        </span>

        <span v-if="formattedPath" class="text-gray-600">›</span>

        <!-- 数据路径 -->
        <span v-if="formattedPath" class="truncate text-11px text-gray-400 font-mono">
          {{ formattedPath }}
        </span>

        <span v-if="activeNodeLabel" class="text-gray-600">›</span>

        <!-- 测试项名称 -->
        <span v-if="activeNodeLabel" class="shrink-0 text-yellow-400/90 font-medium">
          {{ activeNodeLabel }}
        </span>
      </template>
    </div>

    <!-- 右侧：当前渲染的组件名标签 + 快速复制定位 -->
    <div class="flex shrink-0 items-center gap-2">
      <template v-if="componentKey === 'SettingsView'">
        <span class="border border-blue-500/40 rounded bg-blue-950/60 px-1.5 py-0.5 text-10px text-blue-300 font-mono">
          Preferences
        </span>
      </template>
      <template v-else>
        <span v-if="componentKey" class="border border-blue-500/40 rounded bg-blue-950/60 px-1.5 py-0.5 text-10px text-blue-300 font-mono">
          {{ componentKey }}.vue
        </span>
        <button
          type="button"
          class="cursor-pointer text-11px text-gray-500 transition-colors hover:text-gray-200"
          title="复制完整定位路径"
          @click="copyLocation"
        >
          📋 复制坐标
        </button>
      </template>
    </div>
  </div>
</template>
