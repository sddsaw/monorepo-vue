<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { computed } from 'vue'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'EditorBreadcrumb',
})

const tpStore = useTpStore()

const currentTab = computed(() => tpStore.activeTab)

const formattedPath = computed(() => {
  if (!currentTab.value?.dataPath || currentTab.value.dataPath.length === 0)
    return ''
  return currentTab.value.dataPath.join(' › ')
})

function copyLocation() {
  if (!currentTab.value)
    return
  const loc = `${tpStore.fileName || ''} > ${formattedPath.value} [${currentTab.value.componentKey || ''}.vue]`
  navigator.clipboard.writeText(loc)
  window.$message?.success?.('坐标路径已复制')
}
</script>

<template>
  <div
    v-if="currentTab"
    :style="{
      backgroundColor: 'var(--wb-editor-bg, #1e1e1e)',
      borderColor: 'var(--wb-border-color, #2d2d2d)',
    }"
    class="h-26px flex select-none items-center justify-between border-b px-12px text-12px text-[#858585]"
  >
    <!-- 左侧：UI 库 n-breadcrumb 面包屑导航 -->
    <NBreadcrumb separator="›" class="text-11px font-mono">
      <!-- 针对系统首选项界面的面包屑 -->
      <template v-if="currentTab.componentKey === 'SettingsView'">
        <NBreadcrumbItem>
          <span class="flex items-center gap-4px text-gray-300 font-medium">
            <SvgIcon icon="codicon:settings-gear" class="text-13px text-blue-400" />
            系统首选项
          </span>
        </NBreadcrumbItem>
        <NBreadcrumbItem>
          <span class="text-yellow-400/90 font-medium font-sans">
            {{ currentTab.label || '首选项与设置' }}
          </span>
        </NBreadcrumbItem>
      </template>

      <!-- 针对标准业务测试项的面包屑 -->
      <template v-else>
        <!-- 所属测试文件 -->
        <NBreadcrumbItem>
          <span class="flex items-center gap-4px text-gray-300 font-medium">
            <SvgIcon icon="ri:file-code-line" class="text-13px text-blue-400" />
            {{ tpStore.fileName || '未加载文件' }}
          </span>
        </NBreadcrumbItem>

        <!-- 数据寻址路径 -->
        <NBreadcrumbItem v-if="formattedPath">
          <span class="text-gray-400">
            {{ formattedPath }}
          </span>
        </NBreadcrumbItem>

        <!-- 当前激活测试项节点 -->
        <NBreadcrumbItem v-if="currentTab.label">
          <span class="text-yellow-400/90 font-medium font-sans">
            {{ currentTab.label }}
          </span>
        </NBreadcrumbItem>
      </template>
    </NBreadcrumb>

    <!-- 右侧：当前渲染的组件名标签与快速复制定位 -->
    <div class="flex shrink-0 items-center gap-8px">
      <template v-if="currentTab.componentKey === 'SettingsView'">
        <span class="border border-blue-500/40 rounded bg-blue-950/60 px-6px py-2px text-10px text-blue-300 font-mono">
          Preferences
        </span>
      </template>
      <template v-else>
        <span v-if="currentTab.componentKey" class="border border-blue-500/40 rounded bg-blue-950/60 px-6px py-2px text-10px text-blue-300 font-mono">
          {{ currentTab.componentKey }}.vue
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

<style scoped>
:deep(.n-breadcrumb .n-breadcrumb-item .n-breadcrumb-item__separator) {
  margin: 0 6px;
  color: #555555;
}
:deep(.n-breadcrumb .n-breadcrumb-item .n-breadcrumb-item__link) {
  display: inline-flex;
  align-items: center;
}
</style>
