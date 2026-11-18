<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useThemeStore } from '@/store/modules/theme'
import { useTpStore } from '@/store/modules/tp'
import DockviewContent from './DockviewContent.vue'
import DockviewTab from './DockviewTab.vue'
import MainContent from './index.vue'
import { useWorkbenchDockview } from './useWorkbenchDockview'
import 'dockview-vue/dist/styles/dockview.css'

const themeStore = useThemeStore()
const tpStore = useTpStore()
const host = useTemplateRef<HTMLElement>('dockview')
const { mounts, handleTabAction, relayout } = useWorkbenchDockview(host)
// The editor uses compact tabs independently of the application navigation tab bar.
const tabHeight = computed(() => Math.ceil(32 * Math.max(1, themeStore.fontSize / 14)))
const panels = computed(() => mounts.value.flatMap((mount) => {
  const tab = tpStore.tabs.find(tab => tab.id === mount.id)
  return tab ? [{ ...mount, item: tab }] : []
}))

watch([() => themeStore.tab.visible, tabHeight, () => themeStore.fontSize], relayout, { flush: 'post' })
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
        '--dv-tabs-and-actions-container-height': `calc(${themeStore.tab.visible ? tabHeight : 0}px * var(--app-zoom))`,
        '--dv-tabs-and-actions-container-font-size': `calc(${themeStore.fontSize}px * var(--app-zoom))`,
      }"
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
        <DockviewTab :tab="panel.item" @action="handleTabAction(panel.id, $event)" />
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

/* Chrome uses the original curved silhouette and overlapping feet, not a rounded box. */
.workbench-dockview[data-tab-mode='chrome'] {
  --dock-chrome-active: color-mix(in srgb, rgb(var(--primary-color)) 10%, white);
  --dock-chrome-hover: #dee1e6;
}

.workbench-dockview.dockview-theme-dark[data-tab-mode='chrome'] {
  --dock-chrome-active: color-mix(in srgb, rgb(var(--primary-color)) 30%, black);
  --dock-chrome-hover: #333;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container) {
  padding-right: calc(18px * var(--app-zoom));
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container > .tab) {
  padding-top: calc(2px * var(--app-zoom));
  margin-right: calc(-18px * var(--app-zoom));
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container > .tab:hover) {
  z-index: 9;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tabs-container > .tab.active-tab) {
  z-index: 10;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab .workbench-dock-tab) {
  background: transparent;
  padding-inline: 24px;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.dock-chrome-background),
.workbench-dockview[data-tab-mode='chrome'] :deep(.dock-chrome-divider) {
  display: block;
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:hover .dock-chrome-background) {
  color: var(--dock-chrome-hover);
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab.active-tab .dock-chrome-background) {
  color: var(--dock-chrome-active);
}

.workbench-dockview[data-tab-mode='chrome'] :deep(.tab.active-tab .dock-chrome-divider),
.workbench-dockview[data-tab-mode='chrome'] :deep(.tab:hover .dock-chrome-divider) {
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
