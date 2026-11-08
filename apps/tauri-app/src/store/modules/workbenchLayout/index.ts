import { getCurrentWindow } from '@tauri-apps/api/window'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SetupStoreId } from '@/enum'
import { isTauri } from '@/plugins/tauri'

export type ActivityType
  = | 'explorer'
    | 'search'
    | 'source-control'
    | 'debug'
    | 'remote-explorer'
    | 'extensions'
    | 'testing'
    | 'accounts'
    | 'settings'

export const useWorkbenchLayoutStore = defineStore(SetupStoreId.WorkbenchLayout, () => {
  /** 主侧边栏是否可见 (Ctrl + B) */
  const sidebarVisible = ref<boolean>(true)

  /** 底部问题与日志面板是否可见 (Ctrl + J) */
  const bottomPanelVisible = ref<boolean>(false)

  /** 右侧辅助侧边栏/Copilot 面板是否可见 */
  const secondarySidebarVisible = ref<boolean>(true)

  /** 当前激活的活动栏图标类型 */
  const activeActivity = ref<ActivityType>('explorer')

  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value
  }

  function setSidebarVisible(visible: boolean) {
    sidebarVisible.value = visible
  }

  function toggleSecondarySidebar() {
    secondarySidebarVisible.value = !secondarySidebarVisible.value
  }

  function setSecondarySidebarVisible(visible: boolean) {
    secondarySidebarVisible.value = visible
  }

  function toggleBottomPanel() {
    bottomPanelVisible.value = !bottomPanelVisible.value
  }

  function setBottomPanelVisible(visible: boolean) {
    bottomPanelVisible.value = visible
  }

  function setActiveActivity(activity: ActivityType) {
    if (activeActivity.value === activity && sidebarVisible.value) {
      // 再次点击同一个活动图标：折叠侧边栏
      sidebarVisible.value = false
    }
    else {
      activeActivity.value = activity
      sidebarVisible.value = true
    }
  }

  /** 全局界面缩放比例 (默认 1.0) */
  const zoomLevel = ref<number>(1.0)

  function applyZoom(val: number) {
    zoomLevel.value = Math.min(2.0, Math.max(0.6, Number(val.toFixed(2))))
    if (typeof document !== 'undefined') {
      (document.documentElement.style as any).zoom = zoomLevel.value
    }
  }

  function zoomIn() {
    applyZoom(zoomLevel.value + 0.1)
  }

  function zoomOut() {
    applyZoom(zoomLevel.value - 0.1)
  }

  function resetZoom() {
    applyZoom(1.0)
  }

  async function toggleFullscreen() {
    if (isTauri()) {
      const win = getCurrentWindow()
      const isFull = await win.isFullscreen()
      await win.setFullscreen(!isFull)
    }
    else if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      }
      else {
        await document.exitFullscreen()
      }
    }
  }

  return {
    sidebarVisible,
    bottomPanelVisible,
    secondarySidebarVisible,
    activeActivity,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
    toggleSidebar,
    setSidebarVisible,
    toggleSecondarySidebar,
    setSecondarySidebarVisible,
    toggleBottomPanel,
    setBottomPanelVisible,
    setActiveActivity,
  }
})
