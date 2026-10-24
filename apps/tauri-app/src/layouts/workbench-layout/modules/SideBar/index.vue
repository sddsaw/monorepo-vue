<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import ExplorerTree from './ExplorerTree.vue'
import SettingsView from './SettingsView.vue'

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()
const sidebarWidth = ref<number>(240)
const isResizing = ref(false)

const titleText = computed(() => {
  if (layoutStore.activeActivity === 'settings')
    return '首选项与设置'
  if (layoutStore.activeActivity === 'search')
    return '全局检索'
  return '资源管理器'
})

function startResize(e: MouseEvent) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMouseMove(moveEvent: MouseEvent) {
    const delta = moveEvent.clientX - startX
    sidebarWidth.value = Math.max(180, Math.min(480, startWidth + delta))
  }

  function onMouseUp() {
    isResizing.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <aside
    :style="{
      width: `${sidebarWidth}px`,
      backgroundColor: 'var(--wb-sidebar-bg, #252526)',
      borderColor: 'var(--wb-border-color, #1e1e1e)',
    }"
    class="h-full flex flex-col border-r select-none relative shrink-0"
  >
    <!-- 侧栏顶部标题栏 -->
    <div
      :style="{ borderColor: 'var(--wb-border-color, #2d2d2d)' }"
      class="h-32px flex items-center justify-between px-3 text-xs text-gray-400 font-semibold border-b shrink-0 tracking-wider uppercase"
    >
      <span class="text-11px text-gray-300">{{ titleText }}</span>

      <div v-if="layoutStore.activeActivity === 'explorer'" class="flex items-center gap-1">
        <button
          type="button"
          @click="tpStore.chooseAndOpenFile"
          class="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="打开文件"
        >
          <SvgIcon icon="ri:folder-open-line" class="text-12px" />
        </button>
      </div>
    </div>

    <!-- 侧栏主体视图 -->
    <div class="flex-1 overflow-hidden">
      <!-- 1. 资源管理器树 -->
      <ExplorerTree v-if="layoutStore.activeActivity === 'explorer'" />

      <!-- 2. 设置与主题面板 -->
      <SettingsView v-else-if="layoutStore.activeActivity === 'settings'" />

      <!-- 3. 全局搜索占位 -->
      <div v-else class="p-4 text-xs text-gray-500">
        搜索功能支持测试项跨表检索。
      </div>
    </div>

    <!-- 右边缘拖拽手柄 -->
    <div
      @mousedown="startResize"
      :class="[isResizing ? 'bg-blue-500' : 'hover:bg-blue-500/50']"
      class="absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors z-10"
      title="拖拽调节侧边栏宽度"
    />
  </aside>
</template>
