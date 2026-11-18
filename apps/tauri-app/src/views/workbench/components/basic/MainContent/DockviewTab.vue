<script setup lang="ts">
import type { WorkbenchTabAction } from './useWorkbenchDockview'
import type { WbTabItem } from '@/store/modules/tp'
import { SvgIcon } from '@sa/components'
import { computed, shallowRef } from 'vue'
import { $t } from '@/locales'

const props = defineProps<{ tab: WbTabItem }>()
const emit = defineEmits<{ action: [action: WorkbenchTabAction] }>()
const menuVisible = shallowRef(false)
const menuX = shallowRef(0)
const menuY = shallowRef(0)
const menuOptions = computed(() => [
  { key: 'pin', label: $t(props.tab.pinned ? 'dropdown.unpin' : 'dropdown.pin') },
  { key: 'splitRight', label: '向右分屏' },
  { key: 'splitDown', label: '向下分屏' },
  { type: 'divider', key: 'divider' },
  { key: 'closeCurrent', label: $t('dropdown.closeCurrent'), disabled: props.tab.pinned },
  { key: 'closeOther', label: $t('dropdown.closeOther') },
  { key: 'closeLeft', label: $t('dropdown.closeLeft') },
  { key: 'closeRight', label: $t('dropdown.closeRight') },
  { key: 'closeAll', label: $t('dropdown.closeAll') },
])

function showMenu(event: MouseEvent) {
  menuX.value = event.clientX
  menuY.value = event.clientY
  menuVisible.value = true
}

function selectAction(action: WorkbenchTabAction) {
  menuVisible.value = false
  emit('action', action)
}
</script>

<template>
  <!-- Dockview's enclosing tab owns activation, keyboard navigation and dragging. -->
  <div
    class="dv-default-tab workbench-dock-tab"
    :title="tab.label"
    @contextmenu.prevent="showMenu"
    @mousedown.middle.prevent
    @auxclick.middle.prevent="emit('action', 'closeCurrent')"
  >
    <!-- Same shoulder/foot geometry as materials/page-tab/chrome-tab-bg.vue. -->
    <span class="dock-chrome-background" aria-hidden="true">
      <svg class="dock-chrome-edge" viewBox="0 0 18 36" preserveAspectRatio="none">
        <path d="M17 0h1v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z" fill="currentColor" />
      </svg>
      <span class="dock-chrome-fill" />
      <svg class="dock-chrome-edge dock-chrome-edge--right" viewBox="0 0 18 36" preserveAspectRatio="none">
        <path d="M17 0h1v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z" fill="currentColor" />
      </svg>
    </span>
    <span class="dock-chrome-divider" aria-hidden="true" />
    <SvgIcon v-if="tab.icon" :icon="tab.icon" class="shrink-0 text-ui-14" />
    <span class="dv-default-tab-content">{{ tab.label }}</span>
    <span v-if="tab.isDirty" class="text-primary" aria-label="未保存">●</span>
    <button
      v-if="tab.pinned"
      type="button"
      class="dock-tab-button"
      :aria-label="$t('dropdown.unpin')"
      @pointerdown.stop.prevent
      @click.stop="emit('action', 'pin')"
    >
      <SvgIcon icon="mdi:pin-outline" />
    </button>
    <button
      v-else
      type="button"
      class="dv-default-tab-action dock-tab-button"
      :aria-label="`${$t('dropdown.closeCurrent')} ${tab.label}`"
      @pointerdown.stop.prevent
      @click.stop="emit('action', 'closeCurrent')"
    >
      <SvgIcon icon="ant-design:close-outlined" />
    </button>
    <NDropdown
      trigger="manual"
      placement="bottom-start"
      :show="menuVisible"
      :x="menuX"
      :y="menuY"
      :options="menuOptions"
      @select="selectAction"
      @clickoutside="menuVisible = false"
    />
  </div>
</template>

<style scoped>
.workbench-dock-tab.dv-default-tab {
  isolation: isolate;
  zoom: var(--app-zoom);
  height: 100%;
  font-size: var(--app-font-size);
  gap: 4px;
}

.dock-chrome-background,
.dock-chrome-divider {
  display: none;
  position: absolute;
  pointer-events: none;
}

.dock-chrome-background {
  inset: 0;
  z-index: -1;
  color: transparent;
  transition: color 150ms;
}

.dock-chrome-edge {
  position: absolute;
  left: 0;
  width: 18px;
  height: 100%;
}

.dock-chrome-edge--right {
  left: auto;
  right: 0;
  transform: scaleX(-1);
}

.dock-chrome-fill {
  position: absolute;
  inset: 0 17px;
  background: currentColor;
}

.dock-chrome-divider {
  right: 7px;
  top: 50%;
  width: 1px;
  height: 16px;
  transform: translateY(-50%);
  background: var(--border-color);
}

.dock-tab-button {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 3px;
}

.dock-tab-button:hover {
  background: var(--hover-color);
}
</style>
