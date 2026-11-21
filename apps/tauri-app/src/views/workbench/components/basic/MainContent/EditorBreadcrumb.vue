<script setup lang="ts">
import type { WbTabItem } from '@/store/modules/tp'
import { SvgIcon } from '@sa/components'
import { computed } from 'vue'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'EditorBreadcrumb',
})

const props = defineProps<{ tab?: WbTabItem }>()
const tpStore = useTpStore()

const currentTab = computed(() => props.tab ?? tpStore.activeTab)

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
    class="flex flex-wrap select-none items-center justify-between gap-x-3 border-b border-[var(--border-color)] bg-container px-12px text-[var(--text-muted)] text-ui-12 min-h-ui-26"
  >
    <!-- 左侧：UI 库 n-breadcrumb 面包屑导航 -->
    <NBreadcrumb separator="›" class="min-w-0 flex-1 overflow-hidden text-ui-11" :title="`${tpStore.fileName || ''} / ${formattedPath} / ${currentTab.label || ''}`">
      <!-- 针对系统首选项界面的面包屑 -->
      <template v-if="currentTab.componentKey === 'SettingsView'">
        <NBreadcrumbItem>
          <span class="flex items-center gap-4px text-base-text font-medium">
            <SvgIcon icon="codicon:settings-gear" class="text-primary text-ui-13" />
            系统首选项
          </span>
        </NBreadcrumbItem>
        <NBreadcrumbItem>
          <span class="text-warning/90 font-medium font-sans">
            {{ currentTab.label || '首选项与设置' }}
          </span>
        </NBreadcrumbItem>
      </template>

      <!-- 针对标准业务测试项的面包屑 -->
      <template v-else>
        <!-- 所属测试文件 -->
        <NBreadcrumbItem>
          <span class="flex items-center gap-4px text-base-text font-medium">
            <SvgIcon icon="ri:file-code-line" class="text-primary text-ui-13" />
            {{ tpStore.fileName || '未加载文件' }}
          </span>
        </NBreadcrumbItem>

        <!-- 数据寻址路径 -->
        <NBreadcrumbItem v-if="formattedPath">
          <span class="text-[var(--text-muted)] font-mono">
            {{ formattedPath }}
          </span>
        </NBreadcrumbItem>

        <!-- 当前激活测试项节点 -->
        <NBreadcrumbItem v-if="currentTab.label">
          <span class="text-warning/90 font-medium font-sans">
            {{ currentTab.label }}
          </span>
        </NBreadcrumbItem>
      </template>
    </NBreadcrumb>

    <!-- 右侧：当前渲染的组件名标签与快速复制定位 -->
    <div class="flex shrink-0 items-center gap-8px">
      <template v-if="currentTab.componentKey === 'SettingsView'">
        <span class="border border-primary/40 rounded bg-primary/10 px-6px py-2px text-primary font-mono text-ui-10">
          Preferences
        </span>
      </template>
      <template v-else>
        <span v-if="currentTab.componentKey" class="border border-primary/40 rounded bg-primary/10 px-6px py-2px text-primary font-mono text-ui-10">
          {{ currentTab.componentKey }}.vue
        </span>
        <button
          type="button"
          class="cursor-pointer text-[var(--text-muted)] transition-colors text-ui-11 hover:text-base-text"
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
  color: var(--text-muted);
}
:deep(.n-breadcrumb .n-breadcrumb-item .n-breadcrumb-item__link) {
  display: inline-flex;
  align-items: center;
}

:deep(.n-breadcrumb ul) {
  flex-wrap: nowrap;
  white-space: nowrap;
}
</style>
