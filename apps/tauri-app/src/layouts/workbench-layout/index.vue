<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'
import { useNaiveWorkbenchTheme } from '@/theme/naiveTheme'
import ActivityBar from './modules/ActivityBar.vue'
import BottomPanel from './modules/BottomPanel.vue'
import EditorBreadcrumb from './modules/EditorArea/EditorBreadcrumb.vue'
import EditorArea from './modules/EditorArea/index.vue'
import SideBar from './modules/SideBar/index.vue'
import StatusBar from './modules/StatusBar.vue'
import WindowTitleBar from './modules/WindowTitleBar.vue'

defineOptions({
  name: 'WorkbenchLayout',
})

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()
const themeStore = useWorkbenchThemeStore()
const { activeTheme, themeOverrides } = useNaiveWorkbenchTheme()

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
  }
}

onMounted(() => {
  themeStore.initTheme()
  window.addEventListener('keydown', handleKeyDown)

  // 尝试自动恢复上次打开的文件会话
  try {
    const lastFile = localStorage.getItem('ate_last_opened_file')
    if (lastFile && !tpStore.filePath) {
      tpStore.loadFile(lastFile).catch(() => {
        // 外部文件若已被删除则忽略
      })
    }
  }
  catch {
    // ignore
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <NConfigProvider :theme="activeTheme" :theme-overrides="themeOverrides" class="h-full">
    <NMessageProvider>
      <NDialogProvider>
        <div
          :style="{
            backgroundColor: 'var(--wb-editor-bg, #1e1e1e)',
            color: 'var(--wb-text-color, #cccccc)',
          }"
          class="h-screen w-screen flex flex-col overflow-hidden select-none font-sans"
        >
          <!-- 1. 顶部标题栏 -->
          <WindowTitleBar class="h-35px shrink-0" />

          <!-- 2. 中间主工作区 -->
          <div class="flex-1 flex overflow-hidden relative">
            <!-- 极窄 48px 活动栏 -->
            <ActivityBar class="w-48px shrink-0" />

            <!-- 可伸缩侧边栏 (支持 Ctrl+B 折叠) -->
            <SideBar
              v-show="layoutStore.sidebarVisible"
              class="shrink-0"
            />

            <!-- 主编辑区与底部面板区 -->
            <main class="flex-1 flex flex-col overflow-hidden min-w-0">
              <!-- 顶部面包屑坐标 -->
              <EditorBreadcrumb class="h-26px shrink-0" />

              <!-- Dockview 核心多向分屏区域 -->
              <div class="flex-1 overflow-hidden relative min-h-0">
                <EditorArea class="size-full" />
              </div>

              <!-- 底部面板 (支持 Ctrl+J 折叠) -->
              <BottomPanel
                v-show="layoutStore.bottomPanelVisible"
                class="shrink-0"
              />
            </main>
          </div>

          <!-- 3. 底部紧凑状态栏 -->
          <StatusBar class="h-22px shrink-0" />
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
