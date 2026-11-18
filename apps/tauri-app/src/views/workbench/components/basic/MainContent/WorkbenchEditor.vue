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
const tabHeight = computed(() => Math.max(themeStore.tab.height, Math.ceil(36 * themeStore.fontSize / 14)))
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
  --dv-activegroup-visiblepanel-tab-background-color: rgb(var(--container-bg-color));
  --dv-activegroup-hiddenpanel-tab-background-color: rgb(var(--layout-bg-color));
  --dv-inactivegroup-visiblepanel-tab-background-color: rgb(var(--container-bg-color));
  --dv-inactivegroup-hiddenpanel-tab-background-color: rgb(var(--layout-bg-color));
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
</style>
