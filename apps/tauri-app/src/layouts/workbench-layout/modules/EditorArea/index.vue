<script setup lang="ts">
import { type DockviewApi, type DockviewReadyEvent, DockviewVue } from 'dockview-vue'
import { computed, watch } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import EditorWatermark from './EditorWatermark.vue'
import PanelRenderer from './PanelRenderer.vue'
import 'dockview-vue/dist/styles/dockview.css'

defineOptions({
  components: {
    'ate-panel': PanelRenderer,
  },
})
const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

let dockviewApi: DockviewApi | null = null

const hasTabs = computed(() => tpStore.tabs.length > 0)

function onReady(event: DockviewReadyEvent) {
  dockviewApi = event.api
  layoutStore.setDockviewApi(event.api)

  // 监听分屏窗格激活事件，同步回 Pinia
  dockviewApi.onDidActivePanelChange((panel) => {
    if (panel && tpStore.activeTabId !== panel.id) {
      tpStore.setActiveTab(panel.id)
    }
  })

  // 监听窗格关闭事件
  dockviewApi.onDidRemovePanel((panel) => {
    tpStore.closeTab(panel.id)
  })

  // 初始如果已有 Tab 则恢复渲染
  syncTabsToDockview()
}

/** 将 Pinia tabs 状态同步投影进 Dockview 分屏网格 */
function syncTabsToDockview() {
  if (!dockviewApi)
    return

  // 1. 添加新增的 Tab
  tpStore.tabs.forEach((tab) => {
    const existing = dockviewApi!.getPanel(tab.id)
    if (!existing) {
      dockviewApi!.addPanel({
        id: tab.id,
        component: 'ate-panel',
        title: tab.label,
        params: {
          nodeId: tab.id,
          componentKey: tab.componentKey,
          dataPath: tab.dataPath,
          label: tab.label,
        },
      })
    }
  })

  // 2. 移除已被关闭的 Tab
  const tabIds = new Set(tpStore.tabs.map(t => t.id))
  dockviewApi.panels.forEach((p) => {
    if (!tabIds.has(p.id)) {
      p.api.close()
    }
  })

  // 3. 聚焦当前激活 Tab
  if (tpStore.activeTabId) {
    const active = dockviewApi.getPanel(tpStore.activeTabId)
    if (active) {
      active.api.setActive()
    }
  }
}

// 监听 Pinia 中的 tabs 变化
watch(
  () => tpStore.tabs,
  () => {
    syncTabsToDockview()
  },
  { deep: true },
)

// 监听当前高亮 Tab 变化
watch(
  () => tpStore.activeTabId,
  (newId) => {
    if (dockviewApi && newId) {
      const panel = dockviewApi.getPanel(newId)
      if (panel) {
        panel.api.setActive()
      }
    }
  },
)
</script>

<template>
  <div class="size-full overflow-hidden relative bg-[#1e1e1e]">
    <!-- 空白水印 (当没有打开任何测试项时呈现) -->
    <EditorWatermark v-if="!hasTabs" />

    <!-- Dockview 核心多向分屏网格 -->
    <div v-show="hasTabs" class="size-full">
      <DockviewVue
        class="dockview-theme-dark size-full"
        @ready="onReady"
      />
    </div>
  </div>
</template>

<style>
.dockview-theme-dark {
  --dv-activegroup-visiblepanel-tab-background-color: #1e1e1e;
  --dv-tabs-and-actions-container-background-color: #252526;
  --dv-drag-over-background-color: rgba(0, 122, 204, 0.25);
  --dv-separator-border: #2d2d2d;
  --dv-tabs-container-height: 35px;
}
</style>
