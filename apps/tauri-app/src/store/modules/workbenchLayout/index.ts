import type { DockviewApi } from 'dockview-vue'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { SetupStoreId } from '@/enum'

export type ActivityType = 'explorer' | 'search' | 'settings'

export const useWorkbenchLayoutStore = defineStore(SetupStoreId.WorkbenchLayout, () => {
  /** 主侧边栏是否可见 (Ctrl + B) */
  const sidebarVisible = ref<boolean>(true)

  /** 底部问题与日志面板是否可见 (Ctrl + J) */
  const bottomPanelVisible = ref<boolean>(false)

  /** 当前激活的活动栏图标类型 */
  const activeActivity = ref<ActivityType>('explorer')

  /** 底层 Dockview API 实例控制器 */
  const dockviewApi = shallowRef<DockviewApi | null>(null)

  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value
  }

  function setSidebarVisible(visible: boolean) {
    sidebarVisible.value = visible
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

  function setDockviewApi(api: DockviewApi) {
    dockviewApi.value = api
  }

  return {
    sidebarVisible,
    bottomPanelVisible,
    activeActivity,
    dockviewApi,
    toggleSidebar,
    setSidebarVisible,
    toggleBottomPanel,
    setBottomPanelVisible,
    setActiveActivity,
    setDockviewApi,
  }
})
