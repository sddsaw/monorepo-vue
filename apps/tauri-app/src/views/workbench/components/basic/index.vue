<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'
import { useNaiveWorkbenchTheme } from '@/theme/naiveTheme'
import BottomPanel from './BottomPanel.vue'
import EditorBreadcrumb from './EditorArea/EditorBreadcrumb.vue'
import EditorArea from './EditorArea/index.vue'
import PrimarySideBar from './PrimarySideBar.vue'
import SecondarySideBar from './SecondarySideBar.vue'
import StatusBar from './StatusBar.vue'
import WindowTitleBar from './WindowTitleBar.vue'

defineOptions({
  name: 'WorkbenchBasic',
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
    return
  }

  // Ctrl + ,: 打开设置
  if (isCtrlOrCmd && e.key === ',') {
    e.preventDefault()
    tpStore.openSettingsTab()
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
            backgroundColor: 'var(--wb-activitybar-bg, #181818)',
            color: 'var(--wb-text-color, #cccccc)',
          }"
          class="h-screen w-screen flex flex-col select-none overflow-hidden font-sans"
        >
          <!-- 1. 顶部标题栏 -->
          <WindowTitleBar class="shrink-0" />

          <!-- 2. 中间主工作区 -->
          <div class="relative flex flex-1 overflow-hidden rounded-md">
            <!-- 左侧主侧边栏 (整合 ActivityBar 与 SideBar) -->
            <PrimarySideBar />

            <!-- 主编辑区与底部面板区 -->
            <main class="min-w-0 flex flex-col flex-1 overflow-hidden">
              <!-- 顶部面包屑坐标  -->
              <EditorBreadcrumb class="h-26px shrink-0" />
              <!-- Dockview 核心多向分屏区域 -->
              <div class="relative min-h-0 flex-1 overflow-hidden rounded-md">
                <EditorArea class="size-full" />
              </div>

              <!-- 底部面板 (支持 Ctrl+J 折叠，常驻保留顶部拖拽手柄) -->
              <BottomPanel class="shrink-0" />
            </main>

            <!-- 右侧辅助侧边栏 (Copilot / 聊天面板，常驻保留左侧拖拽手柄) -->
            <SecondarySideBar class="shrink-0" />
          </div>

          <!-- 3. 底部紧凑状态栏 -->
          <StatusBar class="h-22px shrink-0" />
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
