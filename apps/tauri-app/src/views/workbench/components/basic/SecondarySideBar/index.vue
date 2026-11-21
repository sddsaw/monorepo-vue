<script setup lang="ts">
import { ref } from 'vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

defineOptions({
  name: 'SecondarySideBar',
})

setupIconifyOffline()

const layoutStore = useWorkbenchLayoutStore()

const sidebarWidth = ref<number>(340)
const isResizing = ref(false)
const isMaximized = ref(false)

/** 手动拖拽过程中重置最大化状态 */
function handleResize() {
  if (isMaximized.value) {
    isMaximized.value = false
  }
}
</script>

<template>
  <div class="h-full flex shrink-0 items-center">
    <!-- 辅助侧边栏显示时可拖拽调节宽度 -->
    <ResizeHandle
      v-show="layoutStore.secondarySidebarVisible"
      v-model="sidebarWidth"
      direction="col"
      :reverse="true"
      :min="260"
      :max="600"
      title="拖拽调节宽度"
      @start="isResizing = true"
      @end="isResizing = false"
      @resize="handleResize"
    />

    <aside
      :style="{
        width: layoutStore.secondarySidebarVisible ? `${sidebarWidth}px` : '0px',
        opacity: layoutStore.secondarySidebarVisible ? 1 : 0,
      }"
      class="z-20 h-full flex flex-col shrink-0 select-none overflow-hidden border-[var(--border-color)] rounded-[var(--theme-radius)] bg-[var(--panel-bg-color)] text-[var(--text-muted)]"
      :class="[
        layoutStore.secondarySidebarVisible && 'mr-4px border',
        !isResizing ? 'transition-[width,opacity] duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]' : '',
      ]"
    />
  </div>
</template>
