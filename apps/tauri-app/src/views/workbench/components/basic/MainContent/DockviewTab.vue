<script setup lang="ts">
import type { DropdownOption, DropdownProps } from 'naive-ui'
import type { WorkbenchTabAction } from './useWorkbenchDockview'
import type { WbTabItem } from '@/store/modules/tp'
import { SvgIcon } from '@sa/components'
import { useSvgIcon } from '@sa/components/hooks/icon'
import { computed, shallowRef } from 'vue'
import { $t } from '@/locales'
import { uiControlSizeCss, uiFontSizeCss } from '@/theme/typography'

const props = defineProps<{
  tab: WbTabItem
  chrome: boolean
  getDisabledActions: () => WorkbenchTabAction[]
}>()
const emit = defineEmits<{ action: [action: WorkbenchTabAction] }>()
const { SvgIconVNode } = useSvgIcon()
const menuThemeOverrides: DropdownProps['themeOverrides'] = {
  padding: '8px 4px',
  optionHeightMedium: uiControlSizeCss(32),
  optionIconSizeMedium: uiFontSizeCss(16),
  optionIconPrefixWidthMedium: '40px',
}
const menuVisible = shallowRef(false)
const menuX = shallowRef(0)
const menuY = shallowRef(0)
const disabledActions = shallowRef<WorkbenchTabAction[]>([])
const tabTitle = computed(() => props.tab.isDirty
  ? `${props.tab.label} — ${$t('workbench.statusbar.unsavedChanges')}`
  : props.tab.label)
const menuOptions = computed<DropdownOption[]>(() => ([
  {
    key: 'pin',
    label: $t(props.tab.pinned ? 'dropdown.unpin' : 'dropdown.pin'),
    icon: SvgIconVNode({ icon: props.tab.pinned ? 'mdi:pin-off-outline' : 'mdi:pin-outline' }),
  },
  { type: 'divider', key: 'divider-pin' },
  { key: 'splitRight', label: '向右分屏', icon: SvgIconVNode({ icon: 'ri:layout-right-line' }) },
  { key: 'splitDown', label: '向下分屏', icon: SvgIconVNode({ icon: 'ri:layout-bottom-line' }) },
  { type: 'divider', key: 'divider-close' },
  {
    key: 'closeCurrent',
    label: $t('dropdown.closeCurrent'),
    disabled: props.tab.pinned,
    icon: SvgIconVNode({ icon: 'ri:close-line' }),
  },
  { key: 'closeOther', label: $t('dropdown.closeOther'), icon: SvgIconVNode({ icon: 'ant-design:column-width-outlined' }) },
  { key: 'closeLeft', label: $t('dropdown.closeLeft'), icon: SvgIconVNode({ icon: 'mdi:format-horizontal-align-left' }) },
  { key: 'closeRight', label: $t('dropdown.closeRight'), icon: SvgIconVNode({ icon: 'mdi:format-horizontal-align-right' }) },
  { key: 'closeAll', label: $t('dropdown.closeAll'), icon: SvgIconVNode({ icon: 'ant-design:line-outlined' }) },
] satisfies DropdownOption[]).map(option => option.type === 'divider'
  ? option
  : { ...option, disabled: option.disabled || disabledActions.value.includes(option.key as WorkbenchTabAction) }))

function showMenu(event: MouseEvent) {
  // Keep keyboard menu navigation out of the editor without activating another panel.
  (event.currentTarget as HTMLElement).closest<HTMLElement>('.tab')?.focus({ preventScroll: true })
  disabledActions.value = props.getDisabledActions()
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
    :title="tabTitle"
    :data-dirty="Boolean(tab.isDirty)"
    @contextmenu.prevent="showMenu"
    @pointerdown.right.stop
    @pointerdown.middle.prevent
    @mousedown.middle.prevent
    @auxclick.middle.prevent="emit('action', 'closeCurrent')"
  >
    <span class="dock-chrome-background" aria-hidden="true" />
    <span class="dock-chrome-divider" aria-hidden="true" />
    <SvgIcon v-if="tab.icon" :icon="tab.icon" class="shrink-0 text-ui-14" />
    <span class="dv-default-tab-content">{{ tab.label }}</span>
    <span
      v-if="tab.isDirty && (!chrome || tab.pinned)"
      class="dock-tab-dirty text-primary"
      role="img"
      :aria-label="$t('workbench.statusbar.unsavedChanges')"
      :title="$t('workbench.statusbar.unsavedChanges')"
    >●</span>
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
      :class="{ 'dock-tab-button--dirty': chrome && tab.isDirty }"
      :aria-label="`${$t('dropdown.closeCurrent')} ${tabTitle}`"
      @pointerdown.stop.prevent
      @click.stop="emit('action', 'closeCurrent')"
    >
      <span v-if="chrome && tab.isDirty" class="dock-tab-dirty dock-tab-button-dirty" aria-hidden="true">●</span>
      <SvgIcon icon="ant-design:close-outlined" class="dock-tab-close-icon" />
    </button>
    <NDropdown
      v-model:show="menuVisible"
      trigger="manual"
      placement="bottom-start"
      size="medium"
      style="min-width: min(200px, calc(100vw - 16px))"
      :theme-overrides="menuThemeOverrides"
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
  background: currentColor;
  border-radius: var(--theme-radius) var(--theme-radius) 0 0;
  transition: color 150ms;
}

/* Only selected tabs expose these feet; they never enlarge the native drag target. */
.dock-chrome-background::before,
.dock-chrome-background::after {
  position: absolute;
  bottom: 0;
  width: 8px;
  height: 8px;
  pointer-events: none;
}

.dock-chrome-background::before {
  right: 100%;
  background: radial-gradient(circle at 0 0, transparent 8px, currentColor 8px);
}

.dock-chrome-background::after {
  left: 100%;
  background: radial-gradient(circle at 100% 0, transparent 8px, currentColor 8px);
}

.dock-chrome-divider {
  right: 0;
  top: 50%;
  width: 1px;
  height: 16px;
  transform: translateY(-50%);
  background: var(--border-color);
}

.dock-tab-button {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 3px;
}

.dock-tab-dirty {
  flex: none;
  width: 8px;
  text-align: center;
  font-size: 10px;
  line-height: 1;
}

.dock-tab-button:hover {
  background: var(--hover-color);
}

.dock-tab-button:focus-visible {
  outline: 2px solid rgb(var(--primary-color));
  outline-offset: -2px;
}

.dock-tab-button-dirty {
  position: absolute;
}

.dock-tab-button--dirty:not(:hover):not(:focus-visible) .dock-tab-close-icon,
.dock-tab-button--dirty:is(:hover, :focus-visible) .dock-tab-button-dirty {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dock-chrome-background {
    transition: none;
  }
}
</style>
