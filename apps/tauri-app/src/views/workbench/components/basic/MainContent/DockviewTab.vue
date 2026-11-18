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
  zoom: var(--app-zoom);
  height: 100%;
  font-size: var(--app-font-size);
  gap: 4px;
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
