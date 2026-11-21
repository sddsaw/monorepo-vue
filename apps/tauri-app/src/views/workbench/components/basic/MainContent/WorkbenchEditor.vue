<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useThemeStore } from '@/store/modules/theme'
import { useTpStore } from '@/store/modules/tp'
import DockviewContent from './DockviewContent.vue'
import DockviewTab from './DockviewTab.vue'
import MainContent from './index.vue'
import { useCenteredDockviewTabs } from './useCenteredDockviewTabs'
import { useWorkbenchDockview } from './useWorkbenchDockview'
import 'dockview-vue/dist/styles/dockview.css'
import './workbench-sashes.css'

const themeStore = useThemeStore()
const tpStore = useTpStore()
const host = useTemplateRef<HTMLElement>('dockview')
const { mounts, handleTabAction, getDisabledTabActions, relayout } = useWorkbenchDockview(host)
const { scheduleCenter } = useCenteredDockviewTabs(host)
// The editor uses compact tabs independently of the application navigation tab bar.
const tabHeight = computed(() => Math.ceil(32 * Math.max(1, themeStore.fontSize / 14)))
const panels = computed(() => mounts.value.flatMap((mount) => {
  const tab = tpStore.tabs.find(tab => tab.id === mount.id)
  return tab ? [{ ...mount, item: tab }] : []
}))

watch([() => themeStore.tab.visible, tabHeight, () => themeStore.fontSize], relayout, { flush: 'post' })
watch([() => tpStore.activeTabId, () => themeStore.tab.mode, tabHeight], scheduleCenter, { flush: 'post' })

function preventSashTextSelection(event: PointerEvent) {
  if (event.button === 0 && event.target instanceof Element && event.target.closest('.sash:not(.disabled)')) {
    // Dockview 1.x does not cancel the native selection gesture (notably in WebKit).
    // Keep propagation intact: Dockview still needs pointerdown to start resizing.
    event.preventDefault()
  }
}

function openTabMenuFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))
    return
  if (!(event.target instanceof Element))
    return
  const tab = event.target.closest('.tab')?.querySelector<HTMLElement>('.workbench-dock-tab')
  if (!tab)
    return
  event.preventDefault()
  event.stopPropagation()
  const rect = tab.getBoundingClientRect()
  // Delegate at the host: Dockview can replace or move native tab wrappers when docking.
  tab.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left,
    clientY: rect.bottom,
  }))
}
</script>

<template>
  <section
    class="workbench-editor relative min-h-0 min-w-0 flex-1 overflow-hidden bg-container"
  >
    <div
      ref="dockview"
      class="workbench-dockview absolute left-0 top-0"
      :class="themeStore.darkMode ? 'dockview-theme-dark' : 'dockview-theme-light'"
      :data-tab-mode="themeStore.tab.mode"
      :style="{
        '--workbench-tab-height': `calc(${themeStore.tab.visible ? tabHeight : 0}px * var(--app-zoom))`,
        '--dv-tabs-and-actions-container-height': themeStore.tab.visible ? `calc(${tabHeight}px * var(--app-zoom) + 6px)` : '0px',
        '--dv-tabs-and-actions-container-font-size': `calc(${themeStore.fontSize}px * var(--app-zoom))`,
      }"
      @pointerdown.capture="preventSashTextSelection"
      @keydown="openTabMenuFromKeyboard"
    />
    <div v-if="!tpStore.tabs.length" class="pointer-events-none absolute inset-0 overflow-auto">
      <MainContent />
    </div>
    <!-- Teleport keeps Naive UI theme/message providers and Vue state across native panel moves. -->
    <template v-for="panel in panels" :key="panel.id">
      <Teleport :to="panel.content">
        <DockviewContent :tab="panel.item" @activate="panel.panel.api.setActive()" />
      </Teleport>
      <Teleport :to="panel.tab">
        <DockviewTab
          :tab="panel.item"
          :chrome="themeStore.tab.mode === 'chrome'"
          :get-disabled-actions="() => getDisabledTabActions(panel.id)"
          @action="handleTabAction(panel.id, $event)"
        />
      </Teleport>
    </template>
  </section>
</template>

<style scoped>
.workbench-dockview {
  /* Dockview 1.x measures pointer movement in viewport pixels. Keep its grid unzoomed. */
  zoom: calc(1 / var(--app-zoom));
  width: 100%;
  height: 100%;
  --dv-background-color: rgb(var(--layout-bg-color));
  --dv-group-view-background-color: rgb(var(--container-bg-color));
  --dv-tabs-and-actions-container-background-color: rgb(var(--layout-bg-color));
  --dv-activegroup-visiblepanel-tab-background-color: transparent;
  --dv-activegroup-hiddenpanel-tab-background-color: transparent;
  --dv-inactivegroup-visiblepanel-tab-background-color: transparent;
  --dv-inactivegroup-hiddenpanel-tab-background-color: transparent;
  --dv-activegroup-visiblepanel-tab-color: rgb(var(--primary-color));
  --dv-activegroup-hiddenpanel-tab-color: var(--text-muted);
  --dv-inactivegroup-visiblepanel-tab-color: rgb(var(--base-text-color));
  --dv-inactivegroup-hiddenpanel-tab-color: var(--text-muted);
  --dv-tab-divider-color: var(--border-color);
  --dv-separator-border: var(--border-color);
  --dv-active-sash-color: rgb(var(--primary-color));
  --dv-drag-over-background-color: var(--active-color);
  --dv-drag-over-border-color: rgb(var(--primary-color));
  --dv-icon-hover-background-color: var(--hover-color);
  --dv-paneview-active-outline-color: rgb(var(--primary-color));
  --dv-tabs-container-scrollbar-color: var(--border-color);
}

/* Only decorate native tabs; Dockview continues to own their order, focus and drag targets. */
.workbench-dockview :deep(.tabs-and-actions-container) {
  min-height: var(--dv-tabs-and-actions-container-height);
}

.workbench-dockview :deep(.tabs-container) {
  min-width: 0;
  align-items: flex-start;
  overflow-x: auto;
  /* A reserved track prevents native scrollbars from squeezing tab content. */
  scrollbar-width: auto;
}

.workbench-dockview :deep(.tabs-container::-webkit-scrollbar) {
  height: 6px;
}

.workbench-dockview :deep(.tabs-container > .tab) {
  flex: 0 0 auto;
  height: var(--workbench-tab-height);
}

.workbench-dockview :deep(.tabs-container > .tab::before) {
  display: none;
}

.workbench-dockview :deep(.workbench-dock-tab) {
  box-sizing: border-box;
  transition: background-color 150ms, border-color 150ms, color 150ms;
}

.workbench-dockview :deep(.tab:hover .workbench-dock-tab) {
  background-color: var(--hover-color);
}

.workbench-dockview :deep(.tab.active-tab .workbench-dock-tab) {
  background-color: var(--active-color);
}

/* Connected tabs: hover stays flat; only selection joins the content surface. */
.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-and-actions-container) {
  /* Match the existing reserved scrollbar track to the content below it. */
  background: linear-gradient(to top, rgb(var(--container-bg-color)) 6px, rgb(var(--layout-bg-color)) 6px);
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container > .tab::after) {
  /* Replace Dockview's mouse-focus rectangle; keyboard focus is styled below. */
  display: none;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container) {
  padding-right: calc(8px * var(--app-zoom));
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container > .tab.active-tab) {
  z-index: 1;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab .workbench-dock-tab) {
  background: transparent;
  padding-inline: 12px;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab .dock-tab-button--dirty),
.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:focus-within .dock-tab-button) {
  visibility: visible;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.dock-chrome-background),
.workbench-dockview[data-tab-mode='chrome'] :deep(.dock-chrome-divider) {
  display: block;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:not(.active-tab):hover .dock-chrome-background) {
  color: var(--hover-color);
  border-radius: var(--theme-radius);
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab.active-tab .dock-chrome-background) {
  color: rgb(var(--container-bg-color));
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab.active-tab .dock-chrome-background::before),
.workbench-dockview[data-tab-mode='chrome'] :deep(.tab.active-tab .dock-chrome-background::after) {
  content: '';
}

/* The first tab meets the group boundary without an inset or a left foot. */
.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:first-child.active-tab .dock-chrome-background) {
  border-top-left-radius: 0;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:first-child.active-tab .dock-chrome-background::before) {
  content: none;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:is(.active-tab, :hover) .dock-chrome-divider),
.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:has(+ .tab:is(.active-tab, :hover)) .dock-chrome-divider) {
  opacity: 0;
}

/* Button: separated bordered pills, with space above and below. */
.workbench-dockview[data-tab-mode='button'] :deep(.tabs-container > .tab) {
  padding: calc(3px * var(--app-zoom));
}

.workbench-dockview[data-tab-mode='button'] :deep(.workbench-dock-tab) {
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.workbench-dockview[data-tab-mode='button'] :deep(.tab.active-tab .workbench-dock-tab),
.workbench-dockview[data-tab-mode='button'] :deep(.tab:hover .workbench-dock-tab) {
  border-color: rgb(var(--primary-color) / 0.5);
}

/* Slider: full-height tabs with an underline on the visible panel of each group. */
.workbench-dockview[data-tab-mode='slider'] :deep(.workbench-dock-tab) {
  border-bottom: 2px solid transparent;
}

.workbench-dockview[data-tab-mode='slider'] :deep(.tab.active-tab .workbench-dock-tab) {
  border-bottom-color: rgb(var(--primary-color));
}

.workbench-dockview :deep(.tab:focus-visible) {
  outline: calc(2px * var(--app-zoom)) solid rgb(var(--primary-color));
  outline-offset: calc(-2px * var(--app-zoom));
}
</style>
