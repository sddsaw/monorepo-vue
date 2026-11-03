<script setup lang="ts">
import { ref } from 'vue'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import ActivityBar from './ActivityBar.vue'
import ResizeHandle from './ResizeHandle.vue'
import SideBar from './SideBar/index.vue'

defineOptions({
  name: 'PrimarySideBar',
})

const layoutStore = useWorkbenchLayoutStore()

const sidebarWidth = ref<number>(240)
const isResizing = ref(false)

/** 向左拖拽超过阈值时触发平滑收起 */
function handleCollapse() {
  layoutStore.setSidebarVisible(false)
  isResizing.value = false
  // 保持恢复宽度为默认最小可用宽度 240px
  sidebarWidth.value = 240
}

/** 折叠状态下向右拖拽手柄时重新展开侧边栏 */
function handleExpand() {
  layoutStore.setSidebarVisible(true)
}
</script>

<template>
  <div class="h-full flex shrink-0 items-center">
    <!-- 主侧边栏圆角浮动卡片面板 (包含 ActivityBar 与 SideBar) -->
    <aside
      :style="{
        backgroundColor: 'var(--wb-activitybar-bg, #181818)',
        borderColor: 'var(--wb-border-color, #2b2b2b)',
      }"
      class="z-20 ml-4px h-full flex shrink-0 select-none overflow-hidden border rounded-8px text-[#858585]"
    >
      <!-- 左侧极窄活动栏 -->
      <ActivityBar />

      <!-- 可伸缩主侧边栏 (内部自驱动丝滑宽度/透明度折叠动画) -->
      <SideBar
        :width="sidebarWidth"
        :is-resizing="isResizing"
        class="shrink-0"
      />
    </aside>

    <!-- 最右侧间距与拖拽拉伸手柄 (常驻显示：展开时可向左拖拽收起，折叠后仍可向右拖拽重新拉开) -->
    <ResizeHandle
      v-model="sidebarWidth"
      direction="col"
      :min="240"
      :max="500"
      :collapsed="!layoutStore.sidebarVisible"
      :collapse-threshold="200"
      :expand-threshold="40"
      :title="layoutStore.sidebarVisible ? '拖拽调节宽度 (向左拖拽收起)' : '向右拖拽或双击展开侧边栏'"
      @start="isResizing = true"
      @end="isResizing = false"
      @collapse="handleCollapse"
      @expand="handleExpand"
      @dblclick="!layoutStore.sidebarVisible && handleExpand()"
    />
  </div>
</template>
