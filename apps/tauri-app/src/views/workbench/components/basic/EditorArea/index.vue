<script setup lang="ts">
import { type DockviewApi, type DockviewReadyEvent, DockviewVue } from 'dockview-vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import DockviewGroupTabs from './DockviewGroupTabs.vue'
import DockviewHeaderActions from './DockviewHeaderActions.vue'
import DockviewTab from './DockviewTab.vue'
import EditorWatermark from './EditorWatermark.vue'
import PanelRenderer from './PanelRenderer.vue'
import SettingsEditor from './SettingsEditor.vue'
import 'dockview-vue/dist/styles/dockview.css'

defineOptions({
  components: {
    'ate-panel': PanelRenderer,
    'settings-panel': SettingsEditor,
    'wb-tab': DockviewTab,
    'wb-group-tabs': DockviewGroupTabs,
    'wb-header-actions': DockviewHeaderActions,
  },
})

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

const dockviewContainerRef = ref<HTMLElement | null>(null)
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
      const isSettings = tab.componentKey === 'SettingsView' || tab.id === 'workbench-settings'
      dockviewApi!.addPanel({
        id: tab.id,
        component: isSettings ? 'settings-panel' : 'ate-panel',
        tabComponent: 'wb-tab',
        title: tab.label,
        params: {
          nodeId: tab.id,
          componentKey: tab.componentKey,
          dataPath: tab.dataPath,
          label: tab.label,
          icon: tab.icon,
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

// 当从无 Tab 切换到有 Tab 时确保校准容器布局
watch(
  () => hasTabs.value,
  (val) => {
    if (val && dockviewApi) {
      nextTick(() => {
        const el = dockviewContainerRef.value
        if (el && dockviewApi && el.clientWidth > 0 && el.clientHeight > 0) {
          dockviewApi.layout(el.clientWidth, el.clientHeight, true)
        }
      })
    }
  },
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
  <div
    :style="{ backgroundColor: 'var(--wb-editor-bg, #1e1e1e)' }"
    class="relative size-full overflow-hidden"
  >
    <!-- 空白水印层 (未打开任何标签页时覆盖展示) -->
    <EditorWatermark v-if="!hasTabs" class="absolute inset-0 z-10" />

    <!-- Dockview 核心多向分屏网格 (始终保持真实尺寸挂载，避免隐藏态 0x0 布局异常) -->
    <div
      ref="dockviewContainerRef"
      class="size-full"
      :class="[!hasTabs && 'pointer-events-none opacity-0']"
    >
      <DockviewVue
        class="dockview-theme-dark wb-dockview size-full"
        default-tab-component="wb-tab"
        prefix-header-actions-component="wb-group-tabs"
        right-header-actions-component="wb-header-actions"
        @ready="onReady"
      />
    </div>
  </div>
</template>

<style>
.dockview-theme-dark.wb-dockview {
  --dv-background-color: var(--wb-editor-bg, #1e1e1e);
  --dv-group-view-background-color: var(--wb-editor-bg, #1e1e1e);
  --dv-tabs-and-actions-container-background-color: var(--wb-activitybar-bg, #181818);
  --dv-activegroup-visiblepanel-tab-background-color: var(--wb-editor-bg, #1e1e1e);
  --dv-activegroup-hiddenpanel-tab-background-color: var(--wb-activitybar-bg, #181818);
  --dv-inactivegroup-visiblepanel-tab-background-color: var(--wb-editor-bg, #1e1e1e);
  --dv-inactivegroup-hiddenpanel-tab-background-color: var(--wb-activitybar-bg, #181818);
  --dv-activegroup-visiblepanel-tab-color: var(--wb-text-color, #ffffff);
  --dv-activegroup-hiddenpanel-tab-color: #858585;
  --dv-inactivegroup-visiblepanel-tab-color: #8f8f8f;
  --dv-inactivegroup-hiddenpanel-tab-color: #6e6e6e;
  --dv-tab-divider-color: var(--wb-border-color, #2b2b2b);
  --dv-drag-over-background-color: rgba(0, 122, 204, 0.22);
  --dv-separator-border: var(--wb-border-color, #2b2b2b);
  --dv-tabs-and-actions-container-height: 44px;
  --dv-tabs-and-actions-container-font-size: 14px;
}

.wb-dockview .tabs-and-actions-container {
  align-items: center;
  box-shadow: var(--tab-box-shadow, 0 1px 2px rgba(0, 21, 41, 0.08));
}

/* 由 DockviewGroupTabs (BetterScroll + Chrome PageTab) 接管渲染并占满左侧弹性宽度 */
.wb-dockview .tabs-and-actions-container > .pre-actions-container {
  flex: 1 1 0%;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.wb-dockview .tabs-and-actions-container > .tabs-container,
.wb-dockview .tabs-and-actions-container > .left-actions-container,
.wb-dockview .tabs-and-actions-container > .void-container {
  display: none !important;
}

.wb-dockview .tabs-and-actions-container > .right-actions-container {
  flex-shrink: 0;
  height: 100%;
  display: flex;
  align-items: center;
}
</style>
