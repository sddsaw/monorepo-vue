<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import type { Component, VNodeChild } from 'vue'
import type { IconType, ToolbarGroup, ToolbarItem, WindowTitleBarMenu, WindowTitleBarMenuItem } from './types'
import { SvgIcon } from '@sa/components'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { NButton, NDropdown, NTooltip } from 'naive-ui'
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ProximaLogo from '@/components/common/ProximaLogo.vue'
import { $t } from '@/locales'
import { isTauri } from '@/plugins/tauri'
import { useThemeStore } from '@/store/modules/theme'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { getTypographyTheme, uiControlSizeCss } from '@/theme/typography'
import { openIframeDemo } from '@/views/workbench/config/iframeDemo'
import { getMenus } from '@/views/workbench/config/menuConfig'
import { getToolbarGroups } from '@/views/workbench/config/toolbarConfig'
import SettingsView from './components/SettingsView.vue'

// 重新导出类型，方便外部直接从组件引入
export type { IconType, ToolbarGroup, ToolbarItem, WindowTitleBarMenu, WindowTitleBarMenuItem }

defineOptions({
  name: 'WindowTitleBar',
})

// ─── 1. Props 与 Emits ───
const props = withDefaults(
  defineProps<{
    /** 顶部菜单配置（若不传则自动使用 menuConfig 默认配置） */
    menus?: WindowTitleBarMenu[]
    /** 快捷工具栏分组（若不传则自动使用 toolbarConfig 默认配置） */
    toolbarGroups?: ToolbarGroup[]
    /** 应用标题 */
    title?: string
    /** 是否展示 Logo */
    showLogo?: boolean
    /** 是否展示中间搜索栏 */
    showSearch?: boolean
    /** 搜索框占位提示文本 */
    searchPlaceholder?: string
    /** 搜索框关键字双向绑定 */
    searchKeyword?: string
    /** 是否展示工作区视图控制按钮（侧边栏、底部面板等） */
    showLayoutControls?: boolean
    /** 是否展示原生窗口按钮（最小化/最大化/关闭，仅非 Mac 平台展示） */
    showWindowControls?: boolean
    /** 是否展示第二行快捷工具栏 */
    showToolbar?: boolean
    /** 是否展示右侧运行适配器状态 */
    showAdapterStatus?: boolean
  }>(),
  {
    menus: undefined,
    toolbarGroups: undefined,
    title: 'Proxima',
    showLogo: true,
    showSearch: true,
    searchPlaceholder: undefined,
    searchKeyword: undefined,
    showLayoutControls: true,
    showWindowControls: true,
    showToolbar: true,
    showAdapterStatus: true,
  },
)

const emit = defineEmits<{
  (e: 'select', key: string | number, item?: WindowTitleBarMenuItem): void
  (e: 'menuSelect', key: string | number, item?: WindowTitleBarMenuItem): void
  (e: 'update:searchKeyword', val: string): void
  (e: 'search', val: string): void
}>()

// ─── 2. 基础状态与 Store ───
const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()
/** macOS 系统需为左侧原生红绿灯留出安全避让边距 */
const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
/** 设置弹窗显隐状态 */
const showSettings = ref(false)

// ─── 3. 菜单项数据标准化与转换 ───
/** 图标渲染辅助：统一转换为 VNodeChild 渲染函数 */
function renderMenuIcon(icon?: IconType): (() => VNodeChild) | undefined {
  if (!icon)
    return undefined
  if (typeof icon === 'string')
    return () => h(SvgIcon, { icon, class: 'text-ui-16 shrink-0' })
  if (typeof icon === 'function')
    return icon as () => VNodeChild
  return () => h(icon as Component, { class: 'text-ui-16 shrink-0' })
}

/** 菜单项标签渲染：当含有快捷键时，标签居左、快捷键靠右弱化显示 */
function renderOptionLabel(item: WindowTitleBarMenuItem): string | (() => VNodeChild) {
  if (!item.shortcut)
    return item.label
  return () =>
    h('div', { class: 'flex items-center justify-between gap-16px w-full min-w-130px select-none' }, [
      h('span', { class: 'truncate' }, item.label),
      h('span', { class: 'text-ui-12 text-[var(--text-muted)] font-mono shrink-0 ml-auto pl-8px' }, item.shortcut),
    ])
}

/** 递归将菜单配置转换为 Naive UI 所需的 DropdownOption 结构 */
function transformToDropdownOptions(items: WindowTitleBarMenuItem[]): DropdownOption[] {
  const options: DropdownOption[] = []
  for (const item of items) {
    if (item.divided || item.type === 'divider') {
      options.push({ type: 'divider', key: `div-${String(item.key)}` })
    }
    const rawChildren = item.children || item.options
    options.push({
      key: item.key,
      label: renderOptionLabel(item),
      icon: renderMenuIcon(item.icon),
      disabled: Boolean(item.disabled),
      _sourceItem: item,
      children: rawChildren?.length ? transformToDropdownOptions(rawChildren) : undefined,
    })
  }
  return options
}

/** 当前生效菜单列表（优先使用外部传入，默认回退配置） */
const activeMenus = computed(() => props.menus ?? getMenus())

/** 规范化后带有 Dropdown 下拉配置的顶层菜单集合 */
const normalizedMenus = computed(() =>
  activeMenus.value.map(menu => ({
    ...menu,
    _dropdownOptions: transformToDropdownOptions(menu.children || menu.options || []),
  })),
)

/** 菜单 Key -> 原始项对象的快速查找表（用于点击时触发 onSelect） */
const itemKeyMap = computed(() => {
  const map = new Map<string | number, WindowTitleBarMenuItem>()
  function collect(items?: WindowTitleBarMenuItem[]) {
    if (!items)
      return
    for (const item of items) {
      map.set(item.key, item)
      collect(item.children || item.options)
    }
  }
  for (const menu of activeMenus.value) {
    collect(menu.children || menu.options)
  }
  return map
})

/** 统一菜单项选择事件分发 */
function handleMenuSelect(key: string | number, option?: DropdownOption) {
  if (key === 'preferences') {
    showSettings.value = true
  }
  const item = (option as any)?._sourceItem || itemKeyMap.value.get(key)
  item?.onSelect?.(item)
  emit('select', key, item)
  emit('menuSelect', key, item)
}

// ─── 4. 标题栏自适应溢出收纳 (窄屏自动收起至省略号) ───
const menuContainerRef = ref<HTMLElement | null>(null)
const visibleCount = ref(activeMenus.value.length)
let menuItemWidths: number[] = []
let resizeObserver: ResizeObserver | null = null
const themeStore = useThemeStore()
const iconButtonSize = uiControlSizeCss(28)

/** 超出左侧可用宽度的菜单项折叠为级联子菜单 */
const overflowMenuOptions = computed<DropdownOption[]>(() =>
  normalizedMenus.value.slice(visibleCount.value).map(menu => ({
    key: `overflow-${menu.key}`,
    label: menu.label,
    icon: renderMenuIcon(menu.icon),
    disabled: menu.disabled,
    children: menu._dropdownOptions,
  })),
)

/** 根据容器当前可用宽度计算可展示的菜单数量 */
function updateVisibleMenus() {
  const container = menuContainerRef.value
  if (!container || container.clientWidth <= 0)
    return

  const currentMenus = activeMenus.value
  // 首次渲染或数量改变时缓存测量宽度
  if (menuItemWidths.length !== currentMenus.length) {
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-menu-item]'))
    if (items.length === currentMenus.length) {
      menuItemWidths = items.map(el => el.offsetWidth)
    }
  }
  if (menuItemWidths.length === 0)
    return

  const GAP = 2
  const ELLIPSIS_WIDTH = Number.parseFloat(getTypographyTheme(themeStore.fontSize).heightSmall) + GAP
  const availableWidth = container.clientWidth
  const totalWidth = menuItemWidths.reduce((sum, w, i) => sum + w + (i > 0 ? GAP : 0), 0)

  // 全量展示或逐项累加放得下的数量
  if (totalWidth <= availableWidth) {
    visibleCount.value = currentMenus.length
    return
  }

  let usedWidth = 0
  let count = 0
  for (const w of menuItemWidths) {
    if (usedWidth + w + GAP <= availableWidth - ELLIPSIS_WIDTH) {
      usedWidth += w + GAP
      count++
    }
    else {
      break
    }
  }
  visibleCount.value = count
}

function remeasureMenus() {
  menuItemWidths = []
  visibleCount.value = activeMenus.value.length
  nextTick(updateVisibleMenus)
}

watch(
  [() => activeMenus.value, () => themeStore.fontSize, () => themeStore.interfaceFont],
  remeasureMenus,
  { deep: true },
)

// ─── 5. 中间搜索框逻辑 ───
const internalSearchKeyword = ref('')
const isSearching = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchTriggerRef = ref<HTMLButtonElement | null>(null)

const currentSearchKeyword = computed({
  get: () => (props.searchKeyword !== undefined ? props.searchKeyword : internalSearchKeyword.value),
  set: (val: string) => {
    internalSearchKeyword.value = val
    emit('update:searchKeyword', val)
  },
})

const computedSearchPlaceholder = computed(() => {
  if (props.searchPlaceholder)
    return props.searchPlaceholder
  return tpStore.fileName
    ? $t('workbench.controls.searchPlaceholder', { file: tpStore.fileName })
    : $t('workbench.controls.searchPlaceholderEmpty')
})

function startSearch() {
  isSearching.value = true
  nextTick(() => searchInputRef.value?.focus())
}

function clearSearch() {
  currentSearchKeyword.value = ''
  nextTick(() => (isSearching.value ? searchInputRef.value : searchTriggerRef.value)?.focus())
}

function handleSearchEsc() {
  currentSearchKeyword.value = ''
  isSearching.value = false
  nextTick(() => searchTriggerRef.value?.focus())
}

function handleSearchSubmit(event: KeyboardEvent) {
  if (event.isComposing)
    return
  event.preventDefault()
  isSearching.value = false
  emit('search', currentSearchKeyword.value)
  nextTick(() => searchTriggerRef.value?.focus())
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (props.showSearch && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    startSearch()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault()
    showSettings.value = !showSettings.value
  }
}

// ─── 6. 快捷工具栏与窗口控制 ───
const activeToolbarGroups = computed(() => props.toolbarGroups ?? getToolbarGroups())

async function handleMinimize() {
  if (isTauri())
    await getCurrentWindow().minimize()
}

async function handleToggleMaximize() {
  if (isTauri())
    await getCurrentWindow().toggleMaximize()
}

async function handleClose() {
  if (isTauri())
    await getCurrentWindow().close()
}

// ─── 7. 生命周期 ───
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', updateVisibleMenus)
  document.fonts.addEventListener('loadingdone', remeasureMenus)

  if (menuContainerRef.value) {
    updateVisibleMenus()
    resizeObserver = new ResizeObserver(updateVisibleMenus)
    resizeObserver.observe(menuContainerRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', updateVisibleMenus)
  document.fonts.removeEventListener('loadingdone', remeasureMenus)
  resizeObserver?.disconnect()
})
</script>

<template>
  <header
    data-tauri-drag-region
    class="workbench-titlebar flex flex-col select-none border-b border-[var(--border-color)] bg-layout font-sans text-ui-12"
  >
    <!-- 第一行：顶部三列居中对称网格标题栏 -->
    <div
      data-tauri-drag-region
      class="titlebar-main grid items-center px-8px py-2px min-h-ui-32"
    >
      <!-- 左列：Logo + 标题 + 自适应菜单栏 (放不下时自动收起到省略号) -->
      <div
        data-tauri-drag-region
        class="h-full min-w-0 flex items-center pr-8px"
        :class="[isMac ? 'pl-56px' : '']"
      >
        <!-- Logo / 标题 -->
        <slot name="logo">
          <div v-if="showLogo" class="mr-8px flex shrink-0 items-center gap-8px text-base-text font-600">
            <ProximaLogo :size="16" :show-shadow="false" />
            <slot name="title">
              <span class="text-ui-14">{{ title }}</span>
            </slot>
          </div>
        </slot>

        <!-- 菜单容器 -->
        <div ref="menuContainerRef" data-tauri-drag-region class="h-full min-w-0 flex flex-1 items-center gap-2px overflow-hidden">
          <div
            v-for="(menu, index) in normalizedMenus"
            :key="menu.key"
            data-menu-item
            class="shrink-0 items-center"
            :style="{ display: index < visibleCount ? 'flex' : 'none' }"
          >
            <NDropdown
              trigger="click"
              size="small"
              :show-arrow="true"
              :options="menu._dropdownOptions"
              @select="handleMenuSelect"
            >
              <NButton quaternary size="small" :disabled="menu.disabled" class="text-base-text !px-8px hover:text-base-text">
                <SvgIcon v-if="typeof menu.icon === 'string'" :icon="menu.icon" class="mr-4px text-ui-16" />
                <component :is="menu.icon" v-else-if="menu.icon" class="mr-4px text-ui-16" />
                <span class="mr-2px">{{ menu.label }}</span>
                <SvgIcon icon="ri:arrow-down-s-line" class="text-[var(--text-muted)] text-ui-16" />
              </NButton>
            </NDropdown>
          </div>

          <!-- 溢出菜单省略号 -->
          <div
            class="shrink-0 items-center"
            :style="{ display: visibleCount < normalizedMenus.length ? 'flex' : 'none' }"
          >
            <NDropdown
              trigger="click"
              :show-arrow="true"
              :options="overflowMenuOptions"
              @select="handleMenuSelect"
            >
              <NButton quaternary size="small" aria-label="更多菜单" class="titlebar-icon-button shrink-0 text-base-text !p-0 hover:text-base-text">
                <template #icon>
                  <SvgIcon icon="codicon:ellipsis" class="text-ui-16" />
                </template>
              </NButton>
            </NDropdown>
          </div>
        </div>
      </div>

      <!-- 中列：居中全局搜索框 -->
      <slot name="search">
        <div
          v-if="showSearch"
          class="titlebar-search min-w-0 flex cursor-text items-center border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-[var(--input-bg-color)] px-8px text-base-text text-ui-14 min-h-ui-28"
          @click="startSearch"
        >
          <SvgIcon icon="ri:search-line" class="mr-8px shrink-0 text-[var(--text-muted)] text-ui-16" />

          <!-- 展示态 -->
          <button
            v-if="!isSearching"
            ref="searchTriggerRef"
            type="button"
            :aria-label="$t('common.search')"
            :aria-keyshortcuts="isMac ? 'Meta+P' : 'Control+P'"
            :title="currentSearchKeyword || computedSearchPlaceholder"
            class="min-w-0 flex-1 truncate bg-transparent text-left text-ui-14 min-h-ui-28"
            :class="currentSearchKeyword ? 'text-base-text' : 'text-[var(--text-muted)]'"
          >
            {{ currentSearchKeyword || computedSearchPlaceholder }}
          </button>

          <!-- 输入态 -->
          <input
            v-else
            ref="searchInputRef"
            v-model="currentSearchKeyword"
            type="text"
            :placeholder="computedSearchPlaceholder"
            :aria-label="$t('common.search')"
            class="titlebar-search-input min-w-0 w-full flex-1 border-none bg-transparent text-base-text outline-none text-ui-14 min-h-ui-28"
            @click.stop
            @blur="isSearching = false"
            @keydown.esc.stop="handleSearchEsc"
            @keydown.enter.stop="handleSearchSubmit"
          >

          <button
            v-if="currentSearchKeyword"
            type="button"
            class="titlebar-icon-button ml-4px flex shrink-0 items-center justify-center rounded-[var(--theme-radius)] text-[var(--text-muted)] hover:bg-[var(--hover-color)] hover:text-base-text"
            aria-label="清空搜索"
            title="清空搜索"
            @mousedown.prevent
            @click.stop="clearSearch"
          >
            <SvgIcon icon="ri:close-line" class="text-ui-16" />
          </button>

          <span class="ml-8px shrink-0 select-none border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-layout px-4px text-[var(--text-muted)] font-mono text-ui-12">
            {{ isMac ? '⌘P' : 'Ctrl+P' }}
          </span>
        </div>
      </slot>

      <!-- 右列：工程文件名、面板切换控制器与窗口控制按钮 -->
      <div data-tauri-drag-region class="titlebar-actions h-full min-w-0 flex items-center justify-end gap-8px pl-8px">
        <slot name="actions" />

        <!-- 视图面板显隐与设置按钮 -->
        <div v-if="showLayoutControls" class="flex shrink-0 items-center gap-8px">
          <!-- 切换主侧边栏 -->
          <ButtonIcon
            icon="ri:layout-left-line"
            :tooltip-content="$t('workbench.controls.toggleSidebar')"
            :aria-label="$t('workbench.controls.toggleSidebar')"
            :aria-pressed="layoutStore.sidebarVisible"
            size="small"
            class="titlebar-icon-button !text-ui-16"
            :type="layoutStore.sidebarVisible ? 'primary' : 'default'"
            :class="[layoutStore.sidebarVisible && 'bg-[var(--active-color)]']"
            @click="layoutStore.toggleSidebar"
          />

          <!-- 切换底部面板 -->
          <ButtonIcon
            icon="ri:layout-bottom-line"
            :tooltip-content="$t('workbench.controls.toggleBottomPanel')"
            :aria-label="$t('workbench.controls.toggleBottomPanel')"
            :aria-pressed="layoutStore.bottomPanelVisible"
            size="small"
            class="titlebar-icon-button !text-ui-16"
            :type="layoutStore.bottomPanelVisible ? 'primary' : 'default'"
            :class="[layoutStore.bottomPanelVisible && 'bg-[var(--active-color)]']"
            @click="layoutStore.toggleBottomPanel"
          />

          <!-- 切换辅助侧边栏 -->
          <ButtonIcon
            icon="ri:layout-right-line"
            :tooltip-content="$t('workbench.controls.toggleSecondarySidebar')"
            :aria-label="$t('workbench.controls.toggleSecondarySidebar')"
            :aria-pressed="layoutStore.secondarySidebarVisible"
            size="small"
            class="titlebar-icon-button !text-ui-16"
            :type="layoutStore.secondarySidebarVisible ? 'primary' : 'default'"
            :class="[layoutStore.secondarySidebarVisible && 'bg-[var(--active-color)]']"
            @click="layoutStore.toggleSecondarySidebar"
          />

          <!-- 设置弹窗 -->
          <ButtonIcon
            icon="codicon:settings-gear"
            :tooltip-content="$t('workbench.controls.settings')"
            :aria-label="$t('workbench.controls.settings')"
            :aria-expanded="showSettings"
            size="small"
            class="titlebar-icon-button !text-ui-16"
            :type="showSettings ? 'primary' : 'default'"
            :class="[
              showSettings ? 'bg-[var(--active-color)] text-base-text' : 'text-[var(--text-muted)] hover:text-base-text',
            ]"
            @click="showSettings = !showSettings"
          />
        </div>

        <!-- 原生窗口控制 (仅 Windows / Linux 展示) -->
        <div v-if="!isMac && showWindowControls" class="flex shrink-0 items-center gap-2px">
          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton quaternary size="small" :aria-label="$t('workbench.controls.minimize')" class="titlebar-icon-button text-[var(--text-muted)] !p-0 hover:text-base-text" @click="handleMinimize">
                <template #icon>
                  <SvgIcon icon="ri:subtract-line" class="text-ui-16" />
                </template>
              </NButton>
            </template>
            <span>{{ $t('workbench.controls.minimize') }}</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton quaternary size="small" :aria-label="$t('workbench.controls.maximize')" class="titlebar-icon-button text-[var(--text-muted)] !p-0 hover:text-base-text" @click="handleToggleMaximize">
                <template #icon>
                  <SvgIcon icon="ri:checkbox-multiple-blank-line" class="text-ui-16" />
                </template>
              </NButton>
            </template>
            <span>{{ $t('workbench.controls.maximize') }}</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton quaternary size="small" :aria-label="$t('workbench.controls.close')" class="titlebar-icon-button text-[var(--text-muted)] !p-0 hover:text-error" @click="handleClose">
                <template #icon>
                  <SvgIcon icon="ri:close-line" class="text-ui-16" />
                </template>
              </NButton>
            </template>
            <span>{{ $t('workbench.controls.close') }}</span>
          </NTooltip>
        </div>
      </div>
    </div>

    <!-- 第二行：快捷工具栏 -->
    <slot name="toolbar">
      <div v-if="showToolbar" class="titlebar-tools flex items-center justify-between gap-16px border-t border-[var(--border-color)] bg-[var(--toolbar-bg-color)] px-12px py-2px min-h-ui-32">
        <NButton size="small" class="shrink-0" @click="openIframeDemo">
          <template #icon>
            <SvgIcon icon="ri:window-line" class="text-ui-16" />
          </template>
          {{ $t('workbench.menu.iframeDemo') }}
        </NButton>
        <!-- 工具按钮分组 -->
        <div class="min-w-0 flex flex-1 items-center overflow-x-auto">
          <template v-for="(group, gIndex) in activeToolbarGroups" :key="group.key">
            <div v-if="gIndex > 0" class="mx-8px h-16px w-1px shrink-0 bg-[var(--border-color)]" />

            <div
              class="flex shrink-0 items-center"
              :class="[
                group.isCluster
                  ? 'gap-4px border border-[var(--border-color)] rounded-[var(--theme-radius)] px-4px py-2px'
                  : 'gap-4px',
              ]"
            >
              <NTooltip v-for="action in group.items" :key="action.key" placement="bottom" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="small"
                    :aria-label="action.tooltip"
                    class="titlebar-icon-button shrink-0 !p-0"
                    :class="[
                      action.class || 'text-base-text hover:text-base-text hover:!bg-[var(--hover-color)]',
                    ]"
                    @click="action.onClick"
                  >
                    <template #icon>
                      <SvgIcon :icon="action.icon" class="text-ui-16" />
                    </template>
                  </NButton>
                </template>
                <span>{{ action.tooltip }}</span>
              </NTooltip>
            </div>
          </template>
        </div>

        <!-- 右侧适配器运行状态 -->
        <slot name="toolbar-right">
          <div v-if="showAdapterStatus && tpStore.activeAdapter" class="titlebar-adapter-status hidden shrink-0 items-center gap-8px text-[var(--text-muted)] text-ui-12 sm:flex">
            <span aria-hidden="true" class="inline-block h-6px w-6px rounded-full bg-success" />
            <span class="text-base-text">{{ tpStore.activeAdapter.name }}</span>
          </div>
        </slot>
      </div>
    </slot>

    <!-- 全局首选项设置弹窗 -->
    <SettingsView v-model:show="showSettings" />
  </header>
</template>

<style scoped>
.workbench-titlebar {
  container: titlebar / inline-size;
}

.titlebar-main {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.titlebar-search {
  width: clamp(120px, calc(30vw / var(--app-zoom, 1)), 420px);
}

.workbench-titlebar :deep(.titlebar-icon-button) {
  width: v-bind(iconButtonSize);
  min-width: v-bind(iconButtonSize);
  height: v-bind(iconButtonSize);
}

.titlebar-search-input::placeholder {
  color: var(--text-muted);
}

.titlebar-search:focus-within {
  outline: 2px solid rgb(var(--primary-color));
  outline-offset: -2px;
}

.workbench-titlebar :deep(button:focus-visible) {
  outline: 2px solid rgb(var(--primary-color));
  outline-offset: -2px;
}

/* Preserve a visible selection even when a quaternary button is hovered. */
.workbench-titlebar :deep(.titlebar-icon-button[aria-pressed='true']),
.workbench-titlebar :deep(.titlebar-icon-button[aria-expanded='true']) {
  background-color: var(--active-color);
}

@media (prefers-reduced-motion: reduce) {
  .workbench-titlebar :deep(button) {
    transition: none;
  }
}

.titlebar-tools {
  flex-shrink: 0;
}

@container titlebar (max-width: 1000px) {
  .titlebar-adapter-status {
    display: none;
  }

  .titlebar-main {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 4px;
  }

  .titlebar-search {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
  }

  .titlebar-actions {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
