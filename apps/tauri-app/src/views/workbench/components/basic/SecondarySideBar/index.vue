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

/** 向右拖拽超过阈值时触发平滑收起 */
function handleCollapse() {
  layoutStore.setSecondarySidebarVisible(false)
  isResizing.value = false
  sidebarWidth.value = 340
}

/** 折叠状态下向左拖拽或双击手柄时重新展开辅助侧边栏 */
function handleExpand() {
  layoutStore.setSecondarySidebarVisible(true)
}

/** 手动拖拽过程中重置最大化状态 */
function handleResize() {
  if (isMaximized.value) {
    isMaximized.value = false
  }
}
</script>

<template>
  <div class="h-full flex shrink-0 items-center">
    <!-- 最左侧常驻拖拽拉伸手柄 (展开时向右拖拽低于 200px 收起，折叠后可向左拖拽或双击重新拉开) -->
    <ResizeHandle
      v-model="sidebarWidth"
      direction="col"
      :reverse="true"
      :min="260"
      :max="600"
      :collapsed="!layoutStore.secondarySidebarVisible"
      :collapse-threshold="200"
      :expand-threshold="40"
      :title="layoutStore.secondarySidebarVisible ? '拖拽调节宽度 (向右拖拽收起)' : '向左拖拽或双击展开辅助侧边栏'"
      @start="isResizing = true"
      @end="isResizing = false"
      @resize="handleResize"
      @collapse="handleCollapse"
      @expand="handleExpand"
      @dblclick="!layoutStore.secondarySidebarVisible && handleExpand()"
    />

    <aside
      :style="{
        width: layoutStore.secondarySidebarVisible ? `${sidebarWidth}px` : '0px',
        opacity: layoutStore.secondarySidebarVisible ? 1 : 0,
        backgroundColor: 'rgb(var(--layout-bg-color))',
        borderColor: 'var(--border-color)',
      }"
      class="z-20 h-full flex flex-col shrink-0 select-none overflow-hidden rounded-[var(--theme-radius)] text-[var(--text-muted)]"
      :class="[
        layoutStore.secondarySidebarVisible && 'mr-4px border',
        !isResizing ? 'transition-[width,opacity] duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]' : '',
      ]"
    />
  </div>
</template>
