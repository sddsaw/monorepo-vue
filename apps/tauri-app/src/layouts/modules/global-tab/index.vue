<script setup lang="ts">
import BetterScroll from '@sa/components/basic/BetterScroll/index.vue'
import DarkModeContainer from '@sa/components/basic/DarkModeContainer/index.vue'
import { PageTab } from '@sa/materials'
import { isPC } from '@sa/utils'
import { useElementBounding } from '@vueuse/core'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useAppStore } from '@/store/modules/app'
import { useTabStore } from '@/store/modules/tab'
import { useThemeStore } from '@/store/modules/theme'
import ContextMenu from './context-menu.vue'

defineOptions({
  name: 'GlobalTab',
})

const props = withDefaults(defineProps<Props>(), {
  customTabs: undefined,
  customActiveTabId: undefined,
  customMode: undefined,
  customDarkMode: undefined,
  customActiveColor: undefined,
  closeByMiddleClick: undefined,
  hideSuffixActions: false,
  draggableTabs: false,
  draggingTabId: '',
  dragOverIndex: null,
  transparentContainer: false,
  customDisabledKeys: undefined,
})

const emit = defineEmits<{
  switchTab: [tabId: string]
  closeTab: [tabId: string]
  contextMenuAction: [payload: { key: App.Global.DropdownKey, tabId: string }]
  tabDragStart: [e: DragEvent, tabId: string]
  tabDragEnd: [e: DragEvent]
  tabDragOver: [e: DragEvent, index: number]
  tabDragLeave: [e: DragEvent, index: number]
  tabDrop: [e: DragEvent, index: number]
  barDragOver: [e: DragEvent]
  barDrop: [e: DragEvent]
}>()

export interface GlobalCustomTabItem {
  id: string
  label: string
  icon?: string
  localIcon?: string
  iconClass?: string
  closable?: boolean
  isDirty?: boolean
  pinned?: boolean
}

interface Props {
  /** 外部受控标签列表；不传时默认使用路由 useTabStore */
  customTabs?: GlobalCustomTabItem[]
  /** 外部受控当前激活标签 ID */
  customActiveTabId?: string
  /** 外部指定标签外观模式（如 'chrome'） */
  customMode?: UnionKey.ThemeTabMode
  /** 外部指定暗黑模式 */
  customDarkMode?: boolean
  /** 外部指定激活主题色 */
  customActiveColor?: string
  /** 是否支持中键关闭标签 */
  closeByMiddleClick?: boolean
  /** 是否隐藏右侧默认刷新/全屏按钮 */
  hideSuffixActions?: boolean
  /** 是否启用标签原生拖拽（配合 Dockview 分屏/排序） */
  draggableTabs?: boolean
  /** 当前正在拖拽的标签 ID */
  draggingTabId?: string
  /** 当前拖拽悬停目标索引 */
  dragOverIndex?: number | null
  /** 是否使用透明容器背景（嵌入工作台分屏头部时融入父容器） */
  transparentContainer?: boolean
  /** 自定义右键菜单禁用项计算函数 */
  customDisabledKeys?: (tabId: string) => App.Global.DropdownKey[]
}

const isCustom = computed(() => props.customTabs !== undefined)

if (isCustom.value) {
  setupIconifyOffline()
}

const route = useRoute()
const appStore = useAppStore()
const themeStore = useThemeStore()
const tabStore = useTabStore()

const bsWrapper = ref<HTMLElement>()
const { width: bsWrapperWidth, left: bsWrapperLeft } = useElementBounding(bsWrapper)
const bsScroll = ref<InstanceType<typeof BetterScroll>>()
const tabRef = ref<HTMLElement>()
const isPCFlag = isPC()

const TAB_DATA_ID = 'data-tab-id'
const MIDDLE_MOUSE_BUTTON = 1
const RIGHT_MOUSE_BUTTON = 2

const resolvedMode = computed<UnionKey.ThemeTabMode>(() => props.customMode ?? themeStore.tab.mode)
const resolvedDarkMode = computed<boolean>(() => props.customDarkMode ?? themeStore.darkMode)
const resolvedActiveColor = computed<string>(() => props.customActiveColor ?? themeStore.themeColor)
const resolvedActiveTabId = computed<string>(() =>
  isCustom.value ? (props.customActiveTabId ?? '') : tabStore.activeTabId,
)

interface DisplayTabItem {
  id: string
  label: string
  icon?: string
  localIcon?: string
  iconClass?: string
  closable: boolean
  isDirty: boolean
  pinned: boolean
  rawRouteTab?: App.Global.Tab
}

const displayTabs = computed<DisplayTabItem[]>(() => {
  if (isCustom.value) {
    return (props.customTabs ?? []).map(tab => ({
      id: tab.id,
      label: tab.label,
      icon: tab.icon,
      localIcon: tab.localIcon,
      iconClass: tab.iconClass,
      closable: tab.closable ?? !tab.pinned,
      isDirty: Boolean(tab.isDirty),
      pinned: Boolean(tab.pinned),
    }))
  }

  return tabStore.tabs.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    localIcon: tab.localIcon,
    closable: !tabStore.isTabRetain(tab.id),
    isDirty: false,
    pinned: tabStore.isTabRetain(tab.id),
    rawRouteTab: tab,
  }))
})

async function scrollToActiveTab() {
  await nextTick()
  bsScroll.value?.instance?.refresh()

  if (!tabRef.value)
    return

  const { children } = tabRef.value

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i]
    const tabId = child.getAttribute(TAB_DATA_ID)

    if (tabId === resolvedActiveTabId.value) {
      const { left, width } = child.getBoundingClientRect()
      const clientX = left + width / 2

      setTimeout(() => {
        bsScroll.value?.instance?.refresh()
        scrollByClientX(clientX)
      }, 50)

      break
    }
  }
}

function scrollByClientX(clientX: number) {
  const currentX = clientX - bsWrapperLeft.value
  const deltaX = currentX - bsWrapperWidth.value / 2

  if (bsScroll.value?.instance) {
    const { maxScrollX, x: leftX, scrollBy } = bsScroll.value.instance

    const rightX = maxScrollX - leftX
    const update = deltaX > 0 ? Math.max(-deltaX, rightX) : Math.min(-deltaX, -leftX)

    scrollBy(update, 0, 300)
  }
}

function handleWheel(e: WheelEvent) {
  const inst = bsScroll.value?.instance
  if (!inst || inst.maxScrollX >= 0)
    return

  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  if (delta === 0)
    return

  const nextX = Math.max(inst.maxScrollX, Math.min(0, inst.x - delta))
  inst.scrollTo(nextX, 0, 120)
}

function getContextMenuDisabledKeys(tabId: string) {
  if (isCustom.value) {
    return props.customDisabledKeys ? props.customDisabledKeys(tabId) : []
  }

  const disabledKeys: App.Global.DropdownKey[] = []

  if (tabStore.isTabRetain(tabId)) {
    const homeDisable: App.Global.DropdownKey[] = ['closeCurrent', 'closeLeft']
    disabledKeys.push(...homeDisable)
  }

  return disabledKeys
}

function handleCloseTab(tab: DisplayTabItem) {
  if (!tab.closable)
    return

  if (isCustom.value) {
    emit('closeTab', tab.id)
    return
  }

  tabStore.removeTab(tab.id)
}

function handleMousedown(e: MouseEvent, tab: DisplayTabItem) {
  const isMiddleClick = e.button === MIDDLE_MOUSE_BUTTON
  const allowMiddleClose = props.closeByMiddleClick ?? themeStore.tab.closeTabByMiddleClick
  if (!isMiddleClick || !allowMiddleClose)
    return

  if (!tab.closable)
    return

  e.preventDefault()
  handleCloseTab(tab)
}

function switchTab(e: MouseEvent, tab: DisplayTabItem) {
  if ([MIDDLE_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON].includes(e.button))
    return

  if (isCustom.value) {
    emit('switchTab', tab.id)
    return
  }

  if (tab.rawRouteTab) {
    tabStore.switchRouteByTab(tab.rawRouteTab)
  }
}

async function refresh() {
  appStore.reloadPage(500)
}

interface DropdownConfig {
  visible: boolean
  x: number
  y: number
  tabId: string
}

const dropdown: DropdownConfig = reactive({
  visible: false,
  x: 0,
  y: 0,
  tabId: '',
})

function setDropdown(config: Partial<DropdownConfig>) {
  Object.assign(dropdown, config)
}

let isClickContextMenu = false

function handleDropdownVisible(visible: boolean | undefined) {
  if (!isClickContextMenu) {
    setDropdown({ visible })
  }
}

async function handleContextMenu(e: MouseEvent, tabId: string) {
  e.preventDefault()

  const { clientX, clientY } = e

  isClickContextMenu = true

  const DURATION = dropdown.visible ? 150 : 0

  setDropdown({ visible: false })

  setTimeout(() => {
    setDropdown({
      visible: true,
      x: clientX,
      y: clientY,
      tabId,
    })
    isClickContextMenu = false
  }, DURATION)
}

const contextMenuTabPinned = computed(() => {
  const item = displayTabs.value.find(t => t.id === dropdown.tabId)
  return Boolean(item?.pinned)
})

function handleContextMenuAction(key: App.Global.DropdownKey) {
  emit('contextMenuAction', { key, tabId: dropdown.tabId })
}

function getChromeTabClass(tab: DisplayTabItem, index: number) {
  const classes = ['h-36px']
  if (props.draggingTabId && props.draggingTabId === tab.id) {
    classes.push('opacity-50')
  }
  if (props.dragOverIndex === index) {
    classes.push('global-tab-drop-target')
  }
  return classes.join(' ')
}

function init() {
  if (!isCustom.value) {
    tabStore.initTabStore(route)
  }
}

function removeFocus() {
  ;(document.activeElement as HTMLElement)?.blur()
}

// watch
if (!isCustom.value) {
  watch(
    () => route.fullPath,
    () => {
      tabStore.addTab(route)
    },
  )
}

watch(
  [resolvedActiveTabId, () => displayTabs.value.length],
  () => {
    scrollToActiveTab()
  },
)

// init
init()
</script>

<template>
  <component
    :is="transparentContainer ? 'div' : DarkModeContainer"
    class="size-full flex-y-center"
    :class="[transparentContainer ? 'pl-12px pr-4px text-[var(--wb-text-color,#cccccc)]' : 'px-16px shadow-tab']"
  >
    <div
      ref="bsWrapper"
      class="h-full flex-1-hidden"
      @wheel.prevent="handleWheel"
      @dragover="draggableTabs ? emit('barDragOver', $event) : undefined"
      @drop="draggableTabs ? emit('barDrop', $event) : undefined"
    >
      <BetterScroll
        ref="bsScroll"
        :options="{
          scrollX: true,
          scrollY: false,
          click: !isPCFlag,
          disableMouse: draggableTabs && isPCFlag,
        }"
        @click="removeFocus"
      >
        <div
          ref="tabRef"
          class="global-tab-list h-full flex pr-18px"
          :class="[
            resolvedMode === 'chrome' || resolvedMode === 'slider' ? 'items-end' : 'items-center gap-12px',
          ]"
        >
          <PageTab
            v-for="(tab, index) in displayTabs"
            :key="tab.id"
            :[TAB_DATA_ID]="tab.id"
            :mode="resolvedMode"
            :dark-mode="resolvedDarkMode"
            :active="tab.id === resolvedActiveTabId"
            :active-color="resolvedActiveColor"
            :closable="tab.closable"
            :chrome-class="getChromeTabClass(tab, index)"
            :draggable="draggableTabs ? 'true' : undefined"
            @pointerdown="switchTab($event, tab)"
            @mousedown="handleMousedown($event, tab)"
            @close="handleCloseTab(tab)"
            @contextmenu="handleContextMenu($event, tab.id)"
            @dragstart="draggableTabs ? emit('tabDragStart', $event, tab.id) : undefined"
            @dragend="draggableTabs ? emit('tabDragEnd', $event) : undefined"
            @dragover="draggableTabs ? emit('tabDragOver', $event, index) : undefined"
            @dragleave="draggableTabs ? emit('tabDragLeave', $event, index) : undefined"
            @drop="draggableTabs ? emit('tabDrop', $event, index) : undefined"
          >
            <template #prefix>
              <SvgIcon
                :icon="tab.icon"
                :local-icon="tab.localIcon"
                class="inline-block shrink-0 align-text-bottom text-16px"
                :class="tab.iconClass"
              />
            </template>
            <div class="max-w-240px flex items-center gap-6px">
              <span class="ellipsis-text text-14px leading-24px">{{ tab.label }}</span>
              <span
                v-if="tab.isDirty"
                class="shrink-0 text-11px text-[#e2c08d] font-semibold leading-none"
                title="存在未保存修改"
              >
                M
              </span>
              <SvgIcon
                v-if="isCustom && tab.pinned"
                icon="mdi:pin-outline"
                class="shrink-0 text-13px opacity-75"
                title="已固定"
              />
            </div>
          </PageTab>
        </div>
      </BetterScroll>
    </div>
    <slot name="suffix">
      <template v-if="!hideSuffixActions">
        <ReloadButton :loading="!appStore.reloadFlag" @click="refresh" />
        <FullScreen :full="appStore.fullContent" @click="appStore.toggleFullContent" />
      </template>
    </slot>
  </component>
  <ContextMenu
    :visible="dropdown.visible"
    :custom="isCustom"
    :is-pinned="contextMenuTabPinned"
    :tab-id="dropdown.tabId"
    :disabled-keys="getContextMenuDisabledKeys(dropdown.tabId)"
    :x="dropdown.x"
    :y="dropdown.y"
    @update:visible="handleDropdownVisible"
    @action="handleContextMenuAction"
  />
</template>

<style scoped>
.global-tab-list {
  isolation: isolate;
}

:deep(.global-tab-drop-target) {
  box-shadow: inset 2px 0 0 0 var(--soy-primary-color);
}
</style>
