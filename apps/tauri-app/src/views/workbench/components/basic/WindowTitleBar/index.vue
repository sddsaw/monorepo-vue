<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import type { Component, VNodeChild } from 'vue'
import type { IconType, ToolbarGroup, ToolbarItem, WindowTitleBarMenu, WindowTitleBarMenuItem } from './types'
import { SvgIcon } from '@sa/components'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { NButton, NDivider, NDropdown, NEllipsis, NTooltip } from 'naive-ui'
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ProximaLogo from '@/components/common/ProximaLogo.vue'
import { $t } from '@/locales'
import { isTauri } from '@/plugins/tauri'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
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
    return () => h(SvgIcon, { icon, class: 'text-14px shrink-0' })
  if (typeof icon === 'function')
    return icon as () => VNodeChild
  return () => h(icon as Component, { class: 'text-14px shrink-0' })
}

/** 菜单项标签渲染：当含有快捷键时，标签居左、快捷键靠右弱化显示 */
function renderOptionLabel(item: WindowTitleBarMenuItem): string | (() => VNodeChild) {
  if (!item.shortcut)
    return item.label
  return () =>
    h('div', { class: 'flex items-center justify-between gap-16px w-full min-w-130px select-none' }, [
      h('span', { class: 'truncate' }, item.label),
      h('span', { class: 'text-10px text-gray-400 font-mono tracking-wider opacity-70 shrink-0 ml-auto pl-8px' }, item.shortcut),
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

/** 超出左侧可用宽度的菜单项折叠为级联子菜单 */
const overflowMenuOptions = computed<DropdownOption[]>(() =>
  normalizedMenus.value.slice(visibleCount.value).map(menu => ({
    key: `overflow-${menu.key}`,
    label: menu.label,
    icon: renderMenuIcon(menu.icon),
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
      menuItemWidths = items.map(el => Math.ceil(el.getBoundingClientRect().width))
    }
  }
  if (menuItemWidths.length === 0)
    return

  const GAP = 2
  const ELLIPSIS_WIDTH = 26
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

watch(
  () => activeMenus.value,
  () => {
    menuItemWidths = []
    visibleCount.value = activeMenus.value.length
    nextTick(updateVisibleMenus)
  },
  { deep: true },
)

// ─── 5. 中间搜索框逻辑 ───
const internalSearchKeyword = ref('')
const isSearching = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

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

function handleSearchEsc() {
  currentSearchKeyword.value = ''
  isSearching.value = false
}

function handleSearchSubmit() {
  isSearching.value = false
  emit('search', currentSearchKeyword.value)
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
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

  if (menuContainerRef.value) {
    updateVisibleMenus()
    resizeObserver = new ResizeObserver(updateVisibleMenus)
    resizeObserver.observe(menuContainerRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', updateVisibleMenus)
  resizeObserver?.disconnect()
})
</script>

<template>
  <header
    data-tauri-drag-region
    class="flex flex-col select-none border-b border-[#1e1e1e] text-12px font-sans"
    :style="{ backgroundColor: 'var(--wb-titlebar-bg, #2d2d2d)' }"
  >
    <!-- 第一行：顶部三列居中对称网格标题栏 -->
    <div
      data-tauri-drag-region
      class="grid h-30px items-center px-8px"
      :style="{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }"
    >
      <!-- 左列：Logo + 标题 + 自适应菜单栏 (放不下时自动收起到省略号) -->
      <div
        data-tauri-drag-region
        class="h-full min-w-0 flex items-center pr-8px"
        :class="[isMac ? 'pl-56px' : '']"
      >
        <!-- Logo / 标题 -->
        <slot name="logo">
          <div v-if="showLogo" class="mr-8px flex shrink-0 items-center gap-6px text-white font-bold tracking-wide">
            <ProximaLogo :size="17" :show-shadow="false" />
            <slot name="title">
              <span class="text-11px">{{ title }}</span>
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
              <NButton quaternary size="tiny" :disabled="menu.disabled" class="text-gray-300 !h-22px !px-6px !text-11px hover:text-white">
                <SvgIcon v-if="typeof menu.icon === 'string'" :icon="menu.icon" class="mr-4px text-12px" />
                <component :is="menu.icon" v-else-if="menu.icon" class="mr-4px text-12px" />
                <span class="mr-2px">{{ menu.label }}</span>
                <SvgIcon icon="ri:arrow-down-s-line" class="text-10px text-gray-400" />
              </NButton>
            </NDropdown>
          </div>

          <!-- 溢出菜单省略号 -->
          <div
            class="shrink-0 items-center"
            :style="{ display: visibleCount < normalizedMenus.length ? 'flex' : 'none' }"
          >
            <NDropdown
              trigger="hover"
              :show-arrow="true"
              :options="overflowMenuOptions"
              @select="handleMenuSelect"
            >
              <NButton quaternary size="tiny" class="shrink-0 text-gray-300 !h-22px !w-24px !p-0 hover:text-white">
                <template #icon>
                  <SvgIcon icon="codicon:ellipsis" class="text-14px" />
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
          class="h-22px min-w-0 flex cursor-pointer items-center border border-[#3e3e42] rounded-4px bg-[#1e1e1e] px-8px text-12px text-gray-300 shadow-inner transition-colors hover:border-blue-500/80"
          :style="{ width: 'clamp(140px, 30vw, 420px)' }"
          @click="startSearch"
        >
          <SvgIcon icon="ri:search-line" class="mr-6px shrink-0 text-12px text-gray-500" />

          <!-- 展示态 -->
          <div v-if="!isSearching" class="min-w-0 flex flex-1 items-center overflow-hidden">
            <NEllipsis :tooltip="{ placement: 'bottom' }" class="w-full select-none text-11px" :class="currentSearchKeyword ? 'text-white' : 'text-gray-400'">
              {{ currentSearchKeyword || computedSearchPlaceholder }}
            </NEllipsis>
          </div>

          <!-- 输入态 -->
          <input
            v-else
            ref="searchInputRef"
            v-model="currentSearchKeyword"
            type="text"
            :placeholder="computedSearchPlaceholder"
            class="min-w-0 w-full flex-1 border-none bg-transparent text-11px text-white outline-none placeholder-gray-500"
            @click.stop
            @blur="isSearching = false"
            @keydown.esc.stop="handleSearchEsc"
            @keydown.enter.stop="handleSearchSubmit"
          >

          <button
            v-if="currentSearchKeyword"
            type="button"
            class="ml-4px shrink-0 p-2px text-gray-400 hover:text-white"
            title="清空"
            @click.stop="currentSearchKeyword = ''"
          >
            <SvgIcon icon="ri:close-line" class="text-11px" />
          </button>

          <span class="ml-6px shrink-0 select-none border border-[#444] rounded-4px bg-[#2d2d2d] px-4px text-9px text-gray-400 font-mono">
            {{ isMac ? '⌘P' : 'Ctrl+P' }}
          </span>
        </div>
      </slot>

      <!-- 右列：工程文件名、面板切换控制器与窗口控制按钮 -->
      <div data-tauri-drag-region class="h-full min-w-0 flex items-center justify-end gap-6px pl-8px">
        <slot name="actions" />

        <!-- 视图面板显隐与设置按钮 -->
        <div v-if="showLayoutControls" class="min-w-0 flex items-center gap-6px">
          <!-- 切换主侧边栏 -->
          <ButtonIcon
            icon="ri:layout-left-line"
            :tooltip-content="$t('workbench.controls.toggleSidebar')"
            :type="layoutStore.sidebarVisible ? 'primary' : 'default'"
            :class="[layoutStore.sidebarVisible && 'bg-white/10']"
            @click="layoutStore.toggleSidebar"
          />

          <!-- 切换底部面板 -->
          <ButtonIcon
            icon="ri:layout-bottom-line"
            :tooltip-content="$t('workbench.controls.toggleBottomPanel')"
            :type="layoutStore.bottomPanelVisible ? 'primary' : 'default'"
            :class="[layoutStore.bottomPanelVisible && 'bg-white/10']"
            @click="layoutStore.toggleBottomPanel"
          />

          <!-- 切换辅助侧边栏 -->
          <ButtonIcon
            icon="ri:layout-right-line"
            :tooltip-content="$t('workbench.controls.toggleSecondarySidebar')"
            :type="layoutStore.secondarySidebarVisible ? 'primary' : 'default'"
            :class="[layoutStore.secondarySidebarVisible && 'bg-white/10']"
            @click="layoutStore.toggleSecondarySidebar"
          />

          <!-- 设置弹窗 -->
          <ButtonIcon
            icon="codicon:settings-gear"
            :tooltip-content="$t('workbench.controls.settings')"
            :type="showSettings ? 'primary' : 'default'"
            :class="[
              showSettings ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white',
            ]"
            @click="showSettings = !showSettings"
          />
        </div>

        <!-- 原生窗口控制 (仅 Windows / Linux 展示) -->
        <div v-if="!isMac && showWindowControls" class="flex shrink-0 items-center gap-2px">
          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton quaternary size="tiny" class="text-gray-400 !h-22px !w-24px !p-0 hover:text-white" @click="handleMinimize">
                <template #icon>
                  <SvgIcon icon="ri:subtract-line" class="text-12px" />
                </template>
              </NButton>
            </template>
            <span>{{ $t('workbench.controls.minimize') }}</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton quaternary size="tiny" class="text-gray-400 !h-22px !w-24px !p-0 hover:text-white" @click="handleToggleMaximize">
                <template #icon>
                  <SvgIcon icon="ri:checkbox-multiple-blank-line" class="text-12px" />
                </template>
              </NButton>
            </template>
            <span>{{ $t('workbench.controls.maximize') }}</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton quaternary size="tiny" class="text-gray-400 !h-22px !w-24px !p-0 hover:!bg-red-600 hover:!text-white" @click="handleClose">
                <template #icon>
                  <SvgIcon icon="ri:close-line" class="text-13px" />
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
      <div v-if="showToolbar" class="h-30px flex items-center justify-between border-t border-[#1e1e1e] bg-[#222222]/90 px-12px">
        <!-- 工具按钮分组 -->
        <div class="flex items-center">
          <template v-for="(group, gIndex) in activeToolbarGroups" :key="group.key">
            <div v-if="gIndex > 0" class="mx-8px h-14px w-1px shrink-0 bg-white/12" />

            <div
              class="flex items-center"
              :class="[
                group.isCluster
                  ? 'gap-2px border border-white/[0.08] rounded-6px bg-black/25 px-4px py-2px shadow-inner'
                  : 'gap-4px',
              ]"
            >
              <NTooltip v-for="action in group.items" :key="action.key" placement="bottom" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="shrink-0 rounded-4px transition-all duration-150 active:scale-95 !p-0"
                    :class="[
                      group.isCluster ? '!h-22px !w-22px' : '!h-24px !w-24px',
                      action.class || 'text-gray-300 hover:text-white hover:!bg-white/10',
                    ]"
                    @click="action.onClick"
                  >
                    <template #icon>
                      <SvgIcon :icon="action.icon" class="text-14px" />
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
          <div v-if="showAdapterStatus && tpStore.activeAdapter" class="hidden items-center gap-6px text-10px text-gray-400 font-mono sm:flex">
            <span class="inline-block h-6px w-6px animate-pulse rounded-full bg-emerald-400" />
            <span class="text-gray-300">{{ tpStore.activeAdapter.name }}</span>
          </div>
        </slot>
      </div>
    </slot>

    <!-- 全局首选项设置弹窗 -->
    <SettingsView v-model:show="showSettings" />
  </header>
</template>
