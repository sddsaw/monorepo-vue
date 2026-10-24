<script setup lang="ts">
import { ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import ExplorerTree from './ExplorerTree.vue'

const tpStore = useTpStore()
const sidebarWidth = ref<number>(240)
const isResizing = ref(false)

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
    :style="{ width: `${sidebarWidth}px` }"
    class="h-full flex flex-col bg-[#252526] border-r border-[#1e1e1e] select-none relative shrink-0"
  >
    <!-- 侧栏顶部标题栏 -->
    <div class="h-32px flex items-center justify-between px-3 text-xs text-gray-400 font-semibold border-b border-[#2d2d2d] shrink-0 tracking-wider uppercase">
      <span class="text-11px text-gray-300">资源管理器</span>

      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="tpStore.chooseAndOpenFile"
          class="p-1 rounded hover:bg-[#3e3e42] hover:text-white transition-colors cursor-pointer"
          title="打开文件"
        >
          <SvgIcon icon="ri:folder-open-line" class="text-12px" />
        </button>
      </div>
    </div>

    <!-- 树主体视图 -->
    <div class="flex-1 overflow-hidden">
      <ExplorerTree />
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
