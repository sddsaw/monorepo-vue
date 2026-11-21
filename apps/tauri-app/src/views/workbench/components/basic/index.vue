<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { getMenus } from '../../config/menuConfig'
import BottomPanel from './BottomPanel/index.vue'
import WorkbenchEditor from './MainContent/WorkbenchEditor.vue'
import PrimarySideBar from './PrimarySideBar/index.vue'
import SecondarySideBar from './SecondarySideBar/index.vue'
import StatusBar from './StatusBar/index.vue'
import WindowTitleBar from './WindowTitleBar/index.vue'

defineOptions({
  name: 'WorkbenchBasic',
})

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

/** 顶部窗口标题栏菜单配置（随系统语言响应式更新） */
const menus = computed(() => getMenus())

/** 是否展示底部状态栏（由环境变量 VITE_SHOW_STATUS_BAR 控制，默认在开发环境下展示） */
const showStatusBar = import.meta.env.VITE_SHOW_STATUS_BAR !== undefined
  ? import.meta.env.VITE_SHOW_STATUS_BAR === 'Y'
  : import.meta.env.DEV

/** 全局快捷键监听 */
function handleKeyDown(e: KeyboardEvent) {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  // Ctrl + B: 切换侧边栏
  if (isCtrlOrCmd && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    layoutStore.toggleSidebar()
    return
  }

  // Ctrl + J: 切换底部面板
  if (isCtrlOrCmd && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    layoutStore.toggleBottomPanel()
    return
  }

  // Ctrl + S: 保存文件
  if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
    e.preventDefault()
    tpStore.saveFile()
    return
  }

  // Ctrl + O: 打开文件
  if (isCtrlOrCmd && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    tpStore.chooseAndOpenFile()
    return
  }

  // F11: 全屏切换
  if (e.key === 'F11') {
    e.preventDefault()
    layoutStore.toggleFullscreen()
    return
  }

  // Ctrl + = / Ctrl + +: 放大 (Zoom In)
  if (isCtrlOrCmd && (e.key === '=' || e.key === '+')) {
    e.preventDefault()
    layoutStore.zoomIn()
    return
  }

  // Ctrl + -: 缩小 (Zoom Out)
  if (isCtrlOrCmd && (e.key === '-' || e.key === '_')) {
    e.preventDefault()
    layoutStore.zoomOut()
    return
  }

  // Ctrl + 0: 重置缩放 (Reset Zoom)
  if (isCtrlOrCmd && e.key === '0') {
    e.preventDefault()
    layoutStore.resetZoom()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="workbench-shell flex flex-col select-none overflow-hidden bg-layout text-base-text font-sans">
    <!-- 1. 顶部标题栏 -->
    <WindowTitleBar :menus="menus" class="shrink-0" />

    <!-- 2. 中间主工作区 -->
    <div class="relative flex flex-1 overflow-hidden rounded-md">
      <!-- 左侧主侧边栏 (资源管理器树) -->
      <PrimarySideBar />

      <!-- 主编辑区与底部面板区 -->
      <main class="min-w-0 flex flex-col flex-1 overflow-hidden rounded-md">
        <NAlert v-if="tpStore.projectWarnings.length" type="warning" :show-icon="true" class="shrink-0" title="工程已加载，存在关联文件提示">
          <div v-for="warning in tpStore.projectWarnings" :key="warning" class="break-all text-ui-12">
            {{ warning }}
          </div>
        </NAlert>
        <WorkbenchEditor />

        <!-- 底部面板 (支持 Ctrl+J 切换显隐) -->
        <BottomPanel class="shrink-0" />
      </main>

      <!-- 右侧辅助侧边栏 (Copilot / 聊天面板) -->
      <SecondarySideBar class="shrink-0" />
    </div>

    <!-- 3. 底部紧凑状态栏 (开发环境下展示，支持环境变量配置) -->
    <StatusBar v-if="showStatusBar" class="shrink-0" />
  </div>
</template>
