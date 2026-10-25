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
  switch (layoutStore.activeActivity) {
    case 'explorer':
      return '资源管理器'
    case 'search':
      return '全局检索'
    case 'source-control':
      return '源代码管理'
    case 'debug':
      return '运行和调试'
    case 'remote-explorer':
      return '远程资源管理器'
    case 'extensions':
      return '扩展'
    case 'testing':
      return '测试'
    case 'settings':
      return '首选项与设置'
    case 'accounts':
      return '账户与配置'
    default:
      return '资源管理器'
  }
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
    class="relative h-full flex flex-col shrink-0 select-none border-r"
  >
    <!-- 侧栏顶部标题栏 -->
    <div
      :style="{ borderColor: 'var(--wb-border-color, #2d2d2d)' }"
      class="h-32px flex shrink-0 items-center justify-between border-b px-3 text-xs text-gray-400 font-semibold tracking-wider uppercase"
    >
      <span class="text-11px text-gray-300">{{ titleText }}</span>

      <div v-if="layoutStore.activeActivity === 'explorer'" class="flex items-center gap-1">
        <button
          type="button"
          class="cursor-pointer rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
          title="打开文件"
          @click="tpStore.chooseAndOpenFile"
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

      <!-- 3. 其他活动视图占位 -->
      <div v-else class="p-4 text-xs text-gray-500">
        <div class="mb-2 text-gray-300 font-medium">
          {{ titleText }}
        </div>
        <p v-if="layoutStore.activeActivity === 'search'">
          搜索功能支持测试项跨文件检索与快速过滤。
        </p>
        <p v-else-if="layoutStore.activeActivity === 'source-control'">
          版本控制面板，支持 Git 代码变更检视与提交。
        </p>
        <p v-else-if="layoutStore.activeActivity === 'debug'">
          自动化测试流断点调试、变量观察与调用栈。
        </p>
        <p v-else-if="layoutStore.activeActivity === 'remote-explorer'">
          远程测试机台与工控仪器连接管理。
        </p>
        <p v-else-if="layoutStore.activeActivity === 'extensions'">
          ATE 插件扩展市场与自定义脚本生态。
        </p>
        <p v-else-if="layoutStore.activeActivity === 'testing'">
          测试套件执行、用例树与测试覆盖率视图。
        </p>
        <p v-else-if="layoutStore.activeActivity === 'accounts'">
          当前已登录账号配置及跨工作台同步。
        </p>
      </div>
    </div>

    <!-- 右边缘拖拽手柄 -->
    <div
      :class="[isResizing ? 'bg-blue-500' : 'hover:bg-blue-500/50']"
      class="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors"
      title="拖拽调节侧边栏宽度"
      @mousedown="startResize"
    />
  </aside>
</template>
