import type { DockviewApi, IDockviewPanel } from 'dockview-vue'
import type { Ref } from 'vue'
import { createDockview } from 'dockview-vue'
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useTpStore } from '@/store/modules/tp'

export type WorkbenchTabAction = 'closeCurrent' | 'closeOther' | 'closeLeft' | 'closeRight' | 'closeAll' | 'pin' | 'splitRight' | 'splitDown'

interface PanelMount {
  id: string
  content: HTMLElement
  tab: HTMLElement
  panel: IDockviewPanel
}

/** Dockview owns layout and tab order; the store owns business items and their data. */
export function useWorkbenchDockview(host: Ref<HTMLElement | null>) {
  const store = useTpStore()
  const mounts = shallowRef<PanelMount[]>([])
  let api: DockviewApi | undefined
  let syncing = false
  let disposed = false
  const subscriptions: { dispose: () => void }[] = []
  const elements = new Map<string, { content?: HTMLElement, tab?: HTMLElement }>()
  const removedIds = new Set<string>()

  function reconcileRemovedPanels() {
    if (disposed || !api)
      return
    // Reconcile a whole native operation before Vue can recreate a still-pending tab.
    for (const id of removedIds) {
      if (!api.getPanel(id)) {
        elements.delete(id)
        store.closeTab(id)
      }
    }
    removedIds.clear()
    store.setActiveTab(api.activePanel?.id ?? '')
  }

  function createRenderer(id: string, kind: 'content' | 'tab') {
    const element = document.createElement('div')
    element.style.height = '100%'
    if (kind === 'content')
      element.style.width = '100%'
    const entry = elements.get(id) ?? {}
    entry[kind] = element
    elements.set(id, entry)
    return { element, init() {} }
  }

  function syncPanels() {
    if (!api || disposed)
      return
    syncing = true
    try {
      const ids = new Set(store.tabs.map(tab => tab.id))
      for (const panel of api.panels) {
        if (!ids.has(panel.id)) {
          api.removePanel(panel)
          elements.delete(panel.id)
        }
      }
      for (const tab of store.tabs) {
        const panel = api.getPanel(tab.id)
        if (!panel) {
          api.addPanel({
            id: tab.id,
            title: tab.label,
            component: 'business',
            tabComponent: 'business-tab',
            renderer: 'always',
            inactive: tab.id !== store.activeTabId,
          })
        }
        else if (panel.title !== tab.label) {
          panel.api.setTitle(tab.label)
        }
      }
      mounts.value = api.panels.map((panel) => {
        const { content, tab } = elements.get(panel.id)!
        return { id: panel.id, content: content!, tab: tab!, panel }
      })
      const active = api.getPanel(store.activeTabId)
      if (active && api.activePanel !== active)
        active.api.setActive()
    }
    finally {
      syncing = false
    }
  }

  function relayout() {
    if (host.value && api && !disposed)
      api.layout(host.value.clientWidth, host.value.clientHeight, true)
  }

  function handleTabAction(id: string, action: WorkbenchTabAction) {
    const panel = api?.getPanel(id)
    if (!panel)
      return
    if (action === 'pin') {
      store.setTabPinned(id, !store.isTabPinned(id))
      return
    }
    if (action === 'splitRight' || action === 'splitDown') {
      if (panel.group.panels.length > 1)
        panel.api.moveTo({ group: panel.group, position: action === 'splitRight' ? 'right' : 'bottom' })
      return
    }
    // Left/right refer to the current Dockview group order, including after drag-and-drop.
    const panels = [...panel.group.panels]
    const index = panels.indexOf(panel)
    const targets = panels.filter((candidate, i) => {
      if (store.isTabPinned(candidate.id))
        return false
      switch (action) {
        case 'closeCurrent': return candidate.id === id
        case 'closeOther': return candidate.id !== id
        case 'closeLeft': return i < index
        case 'closeRight': return i > index
        case 'closeAll': return true
        default: return false
      }
    })
    targets.forEach(target => target.api.close())
  }

  onMounted(() => {
    if (!host.value)
      return
    api = createDockview(host.value, {
      disableFloatingGroups: true,
      createComponent: ({ id }) => createRenderer(id, 'content'),
      createTabComponent: ({ id }) => createRenderer(id, 'tab'),
    })
    subscriptions.push(
      api.onDidActivePanelChange((panel) => {
        if (!syncing && panel && store.activeTabId !== panel.id)
          store.setActiveTab(panel.id)
      }),
      api.onDidRemovePanel((panel) => {
        if (syncing)
          return
        // Moving a panel can emit remove/add. Wait until the native operation finishes.
        if (!removedIds.size)
          queueMicrotask(reconcileRemovedPanels)
        removedIds.add(panel.id)
      }),
    )
    syncPanels()
  })

  watch(() => store.tabs.map(tab => [tab.id, tab.label]), syncPanels, { flush: 'post' })
  watch(() => store.activeTabId, () => {
    if (!syncing && api && api.activePanel?.id !== store.activeTabId)
      api.getPanel(store.activeTabId)?.api.setActive()
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    disposed = true
    subscriptions.forEach(subscription => subscription.dispose())
    api?.dispose()
    elements.clear()
  })

  return { mounts, handleTabAction, relayout }
}
