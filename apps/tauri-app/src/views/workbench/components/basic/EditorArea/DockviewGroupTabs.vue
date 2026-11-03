<script setup lang="ts">
import type {
  DockviewApi,
  DockviewGroupPanel,
  DockviewGroupPanelApi,
  IDockviewPanel,
} from 'dockview-vue'
import type { GlobalCustomTabItem } from '@/layouts/modules/global-tab/index.vue'
import { getPanelData, LocalSelectionTransfer, PanelTransfer } from 'dockview-vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import GlobalTab from '@/layouts/modules/global-tab/index.vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'

defineOptions({
  name: 'DockviewGroupTabs',
})

const props = defineProps<{
  params: {
    containerApi: DockviewApi
    api: DockviewGroupPanelApi
    group: DockviewGroupPanel
  }
}>()

const tpStore = useTpStore()
const wbThemeStore = useWorkbenchThemeStore()

const panelList = shallowRef<IDockviewPanel[]>([])
const activePanelId = ref<string>('')
const isGroupActive = ref<boolean>(true)
const totalGroups = ref<number>(1)

const draggingPanelId = ref<string>('')
const dragOverIndex = ref<number | null>(null)

const disposables: { dispose: () => void }[] = []

function syncGroupState() {
  const { group, containerApi } = props.params
  panelList.value = [...group.panels]
  activePanelId.value = group.activePanel?.id || ''
  isGroupActive.value = containerApi.activeGroup?.id === group.id
  totalGroups.value = containerApi.size
}

onMounted(() => {
  const { group, containerApi } = props.params
  syncGroupState()

  disposables.push(
    group.model.onDidAddPanel(() => syncGroupState()),
    group.model.onDidRemovePanel(() => syncGroupState()),
    group.model.onDidActivePanelChange(() => syncGroupState()),
    containerApi.onDidMovePanel(() => syncGroupState()),
    containerApi.onDidActiveGroupChange(() => syncGroupState()),
    containerApi.onDidLayoutChange(() => syncGroupState()),
  )
})

onBeforeUnmount(() => {
  disposables.forEach(d => d.dispose())
  disposables.length = 0
})

const isDark = computed(() => wbThemeStore.currentTheme.isDark)
const accentColor = computed(() => wbThemeStore.currentTheme.accentColor || '#007acc')

function getIconColorClass(componentKey: string, isSettings: boolean) {
  if (isSettings)
    return 'text-[#cccccc]'
  if (componentKey === 'PinTable')
    return 'text-emerald-400'
  if (componentKey === 'SpecTable')
    return 'text-purple-400'
  if (componentKey === 'SuiteSummary')
    return 'text-amber-400'
  return 'text-[#4ec9b0]'
}

interface GroupTabEntry extends GlobalCustomTabItem {
  panel: IDockviewPanel
}

const groupTabs = computed<GroupTabEntry[]>(() => {
  return panelList.value.map((panel) => {
    const storeTab = tpStore.tabs.find(t => t.id === panel.id)
    const rawParams = (panel.params ?? {}) as Record<string, any>
    const componentKey = storeTab?.componentKey || rawParams.componentKey || ''
    const isSettings = componentKey === 'SettingsView' || panel.id === 'workbench-settings'
    const icon = isSettings
      ? 'ri:equalizer-line'
      : (storeTab?.icon || rawParams.icon || 'ri:file-code-line')
    const pinned = Boolean(storeTab?.pinned)

    return {
      id: panel.id,
      label: storeTab?.label || rawParams.label || panel.title || '未命名',
      icon,
      iconClass: getIconColorClass(componentKey, isSettings),
      closable: !pinned,
      isDirty: Boolean(storeTab?.isDirty),
      pinned,
      panel,
    }
  })
})

function handleSwitchTab(tabId: string) {
  const entry = groupTabs.value.find(t => t.id === tabId)
  if (!entry)
    return

  entry.panel.api.setActive()
  tpStore.setActiveTab(tabId)
}

function handleCloseTab(tabId: string) {
  const entry = groupTabs.value.find(t => t.id === tabId)
  if (!entry || entry.pinned)
    return

  entry.panel.api.close()
}

function getDisabledKeys(tabId: string): App.Global.DropdownKey[] {
  const disabled: App.Global.DropdownKey[] = []
  const items = groupTabs.value
  const idx = items.findIndex(t => t.id === tabId)
  if (idx === -1)
    return disabled

  if (items[idx].pinned) {
    disabled.push('closeCurrent', 'closeLeft')
  }

  if (!items.slice(0, idx).some(t => !t.pinned) && !disabled.includes('closeLeft')) {
    disabled.push('closeLeft')
  }

  if (!items.slice(idx + 1).some(t => !t.pinned)) {
    disabled.push('closeRight')
  }

  if (!items.some((t, i) => i !== idx && !t.pinned)) {
    disabled.push('closeOther')
  }

  if (!items.some(t => !t.pinned)) {
    disabled.push('closeAll')
  }

  return disabled
}

function handleContextMenuAction({ key, tabId }: { key: App.Global.DropdownKey, tabId: string }) {
  const items = [...groupTabs.value]
  const idx = items.findIndex(t => t.id === tabId)
  if (idx === -1)
    return

  const target = items[idx]

  switch (key) {
    case 'closeCurrent': {
      if (!target.pinned) {
        target.panel.api.close()
      }
      break
    }
    case 'closeOther': {
      target.panel.api.setActive()
      items.forEach((item, i) => {
        if (i !== idx && !item.pinned) {
          item.panel.api.close()
        }
      })
      break
    }
    case 'closeLeft': {
      items.slice(0, idx).forEach((item) => {
        if (!item.pinned) {
          item.panel.api.close()
        }
      })
      break
    }
    case 'closeRight': {
      items.slice(idx + 1).forEach((item) => {
        if (!item.pinned) {
          item.panel.api.close()
        }
      })
      break
    }
    case 'closeAll': {
      items.forEach((item) => {
        if (!item.pinned) {
          item.panel.api.close()
        }
      })
      break
    }
    case 'pin': {
      tpStore.setTabPinned(target.id, true)
      const pinnedBefore = items.filter(t => t.id !== target.id && t.pinned).length
      if (idx !== pinnedBefore) {
        target.panel.api.moveTo({
          group: props.params.group,
          index: pinnedBefore,
        })
      }
      break
    }
    case 'unpin': {
      tpStore.setTabPinned(target.id, false)
      const remainingPinned = items.filter(t => t.id !== target.id && t.pinned).length
      if (idx !== remainingPinned) {
        target.panel.api.moveTo({
          group: props.params.group,
          index: remainingPinned,
        })
      }
      break
    }
  }
}

// ─── Dockview 原生拖拽分屏与标签排序桥接 ───
function handleDragStart(e: DragEvent, panelId: string) {
  draggingPanelId.value = panelId
  const transfer = LocalSelectionTransfer.getInstance()
  transfer.setData(
    [new PanelTransfer(props.params.containerApi.id, props.params.group.id, panelId)],
    PanelTransfer.prototype,
  )
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '__dockview_internal_drag_event__')
  }
}

function handleDragEnd() {
  draggingPanelId.value = ''
  dragOverIndex.value = null
  LocalSelectionTransfer.getInstance().clearData(PanelTransfer.prototype)
}

function handleTabDragOver(e: DragEvent, index: number) {
  const data = getPanelData()
  if (!data || data.viewId !== props.params.containerApi.id)
    return

  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function handleTabDragLeave(_e: DragEvent, index: number) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

function handleTabDrop(e: DragEvent, targetIndex: number) {
  const data = getPanelData()
  dragOverIndex.value = null
  if (!data || data.viewId !== props.params.containerApi.id || !data.panelId)
    return

  e.preventDefault()
  e.stopPropagation()

  const sourcePanel = props.params.containerApi.getPanel(data.panelId)
  if (!sourcePanel)
    return

  if (data.groupId === props.params.group.id && data.panelId === panelList.value[targetIndex]?.id)
    return

  sourcePanel.api.moveTo({
    group: props.params.group,
    index: targetIndex,
  })
  sourcePanel.api.setActive()
}

function handleBarDragOver(e: DragEvent) {
  const data = getPanelData()
  if (!data || data.viewId !== props.params.containerApi.id)
    return

  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function handleBarDrop(e: DragEvent) {
  const data = getPanelData()
  dragOverIndex.value = null
  if (!data || data.viewId !== props.params.containerApi.id || !data.panelId)
    return

  e.preventDefault()
  const sourcePanel = props.params.containerApi.getPanel(data.panelId)
  if (!sourcePanel)
    return

  sourcePanel.api.moveTo({
    group: props.params.group,
    index: panelList.value.length,
  })
  sourcePanel.api.setActive()
}
</script>

<template>
  <div
    class="size-full overflow-hidden transition-opacity"
    :class="[totalGroups > 1 && !isGroupActive && 'opacity-80']"
  >
    <GlobalTab
      :custom-tabs="groupTabs"
      :custom-active-tab-id="activePanelId"
      custom-mode="chrome"
      :custom-dark-mode="isDark"
      :custom-active-color="accentColor"
      :close-by-middle-click="true"
      :hide-suffix-actions="true"
      :transparent-container="true"
      :draggable-tabs="true"
      :dragging-tab-id="draggingPanelId"
      :drag-over-index="dragOverIndex"
      :custom-disabled-keys="getDisabledKeys"
      @switch-tab="handleSwitchTab"
      @close-tab="handleCloseTab"
      @context-menu-action="handleContextMenuAction"
      @tab-drag-start="handleDragStart"
      @tab-drag-end="handleDragEnd"
      @tab-drag-over="handleTabDragOver"
      @tab-drag-leave="handleTabDragLeave"
      @tab-drop="handleTabDrop"
      @bar-drag-over="handleBarDragOver"
      @bar-drop="handleBarDrop"
    />
  </div>
</template>
