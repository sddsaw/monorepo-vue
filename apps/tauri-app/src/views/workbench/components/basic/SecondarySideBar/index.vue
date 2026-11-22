<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { ref, shallowRef, useId, useTemplateRef } from 'vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { uiControlSizeCss } from '@/theme/typography'

defineOptions({
  name: 'SecondarySideBar',
})

setupIconifyOffline()

const layoutStore = useWorkbenchLayoutStore()
const tabs = [
  { id: 'inspector', label: 'Inspector', icon: 'lucide:sliders-horizontal' },
  { id: 'help', label: 'Help', icon: 'lucide:book-open' },
  { id: 'issues', label: 'Issues', icon: 'lucide:triangle-alert' },
] as const
const activeTab = shallowRef<(typeof tabs)[number]['id']>('inspector')
const tabId = useId()
const tabButtons = useTemplateRef<HTMLButtonElement[]>('tabButtons')

function handleTabKeydown(event: KeyboardEvent, index: number) {
  let nextIndex: number
  switch (event.key) {
    case 'ArrowRight':
      nextIndex = (index + 1) % tabs.length
      break
    case 'ArrowLeft':
      nextIndex = (index - 1 + tabs.length) % tabs.length
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = tabs.length - 1
      break
    default: return
  }
  event.preventDefault()
  activeTab.value = tabs[nextIndex].id
  const button = tabButtons.value?.[nextIndex]
  button?.focus({ preventScroll: true })
  button?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

const sidebarWidth = ref<number>(340)
const isResizing = ref(false)
const isMaximized = ref(false)

/** 手动拖拽过程中重置最大化状态 */
function handleResize() {
  if (isMaximized.value) {
    isMaximized.value = false
  }
}
</script>

<template>
  <div class="h-full flex shrink-0 items-center">
    <!-- 辅助侧边栏显示时可拖拽调节宽度 -->
    <ResizeHandle
      v-show="layoutStore.secondarySidebarVisible"
      v-model="sidebarWidth"
      direction="col"
      :reverse="true"
      :min="260"
      :max="600"
      title="拖拽调节宽度"
      @start="isResizing = true"
      @end="isResizing = false"
      @resize="handleResize"
    />

    <aside
      :inert="!layoutStore.secondarySidebarVisible"
      :style="{
        width: layoutStore.secondarySidebarVisible ? `${sidebarWidth}px` : '0px',
        opacity: layoutStore.secondarySidebarVisible ? 1 : 0,
      }"
      class="z-20 h-full flex flex-col shrink-0 select-none overflow-hidden border-[var(--border-color)] rounded-[var(--theme-radius)] bg-[var(--panel-bg-color)] text-[var(--text-muted)]"
      :class="[
        layoutStore.secondarySidebarVisible && 'mr-4px border',
        !isResizing ? 'transition-[width,opacity] duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]' : '',
      ]"
    >
      <div class="sidebar-tabs" role="tablist" aria-label="辅助侧边栏">
        <button
          v-for="(tab, index) in tabs"
          :id="`${tabId}-tab-${tab.id}`"
          :key="tab.id"
          ref="tabButtons"
          type="button"
          role="tab"
          class="sidebar-tab"
          :class="{ 'is-active': activeTab === tab.id }"
          :style="{ minHeight: uiControlSizeCss(32) }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`${tabId}-panel-${tab.id}`"
          :tabindex="activeTab === tab.id ? 0 : -1"
          @click="activeTab = tab.id"
          @keydown="handleTabKeydown($event, index)"
        >
          <span class="sidebar-tab-background" aria-hidden="true" />
          <SvgIcon :icon="tab.icon" class="shrink-0 text-ui-16" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
      <div
        v-for="tab in tabs"
        v-show="activeTab === tab.id"
        :id="`${tabId}-panel-${tab.id}`"
        :key="tab.id"
        role="tabpanel"
        :aria-labelledby="`${tabId}-tab-${tab.id}`"
        tabindex="0"
        class="sidebar-tab-panel"
      />
    </aside>
  </div>
</template>

<style scoped>
.sidebar-tabs {
  display: flex;
  flex-shrink: 0;
  overflow-x: auto;
  padding-right: 8px;
  padding-bottom: 6px;
  background: linear-gradient(to top, rgb(var(--container-bg-color)) 6px, rgb(var(--layout-bg-color)) 6px);
  scrollbar-width: thin;
}

.sidebar-tab {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--app-font-size);
  white-space: nowrap;
  cursor: pointer;
}

.sidebar-tab-background {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: var(--theme-radius) var(--theme-radius) 0 0;
  color: transparent;
  background: currentColor;
  pointer-events: none;
  transition: color 150ms;
}

.sidebar-tab:not(.is-active):hover .sidebar-tab-background {
  color: var(--hover-color);
  border-radius: var(--theme-radius);
}

.sidebar-tab.is-active {
  z-index: 1;
  color: rgb(var(--primary-color));
}

.sidebar-tab.is-active .sidebar-tab-background {
  color: rgb(var(--container-bg-color));
}

/* The selected tab joins its panel; the first tab stays flush with the left edge. */
.is-active .sidebar-tab-background::before,
.is-active .sidebar-tab-background::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 8px;
  height: 8px;
}

.is-active .sidebar-tab-background::before {
  right: 100%;
  background: radial-gradient(circle at 0 0, transparent 8px, currentColor 8px);
}

.is-active .sidebar-tab-background::after {
  left: 100%;
  background: radial-gradient(circle at 100% 0, transparent 8px, currentColor 8px);
}

.sidebar-tab:first-child.is-active .sidebar-tab-background {
  border-top-left-radius: 0;
}

.sidebar-tab:first-child.is-active .sidebar-tab-background::before {
  content: none;
}

.sidebar-tab:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  width: 1px;
  height: 16px;
  transform: translateY(-50%);
  background: var(--border-color);
  pointer-events: none;
}

.sidebar-tab:is(.is-active, :hover)::after,
.sidebar-tab:has(+ .sidebar-tab:is(.is-active, :hover))::after {
  display: none;
}

.sidebar-tab:focus-visible,
.sidebar-tab-panel:focus-visible {
  outline: 2px solid rgb(var(--primary-color));
  outline-offset: -2px;
}

.sidebar-tab-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
  background: rgb(var(--container-bg-color));
  color: rgb(var(--base-text-color));
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-tab-background {
    transition: none;
  }
}
</style>
