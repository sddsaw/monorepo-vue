<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { NButton, NDivider, NDropdown, NEllipsis, NTooltip } from 'naive-ui'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProximaLogo from '@/components/common/ProximaLogo.vue'
import { isTauri } from '@/plugins/tauri'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

defineOptions({
  name: 'WindowTitleBar',
})

const router = useRouter()
const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

// 运行平台判断（macOS 需为左侧原生红绿灯预留避让边距）
const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')

// ─── 1. 顶部菜单配置 (File, Edit, View, Run, Tools, Settings, Help) ───
interface MenuConfig {
  key: string
  label: string
  options: DropdownOption[]
}

const menus: MenuConfig[] = [
  {
    key: 'file',
    label: 'File',
    options: [
      { label: '打开工程 (Ctrl+O)', key: 'open' },
      { label: '保存文件 (Ctrl+S)', key: 'save' },
      { type: 'divider', key: 'd1' },
      { label: '返回欢迎首页', key: 'home' },
    ],
  },
  {
    key: 'edit',
    label: 'Edit',
    options: [
      { label: '撤销 (Ctrl+Z)', key: 'undo' },
      { label: '重做 (Ctrl+Y)', key: 'redo' },
    ],
  },
  {
    key: 'view',
    label: 'View',
    options: [
      { label: '切换主侧边栏 (Ctrl+B)', key: 'toggle-sidebar' },
      { label: '切换底部面板 (Ctrl+J)', key: 'toggle-bottom' },
      { label: '切换辅助侧边栏', key: 'toggle-secondary' },
    ],
  },
  {
    key: 'run',
    label: 'Run',
    options: [
      { label: '运行测试流程', key: 'run-test' },
      { label: '执行 DRC 校验 (Ctrl+V)', key: 'validate' },
    ],
  },
  {
    key: 'tools',
    label: 'Tools',
    options: [
      { label: '机台硬件自检', key: 'hardware-check' },
      { label: '通道映射配置', key: 'channel-map' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    options: [
      { label: '首选项设置', key: 'preferences' },
    ],
  },
  {
    key: 'help',
    label: 'Help',
    options: [
      { label: '快捷键说明', key: 'shortcuts' },
      { label: '关于 Proxima', key: 'about' },
    ],
  },
]

// ─── 2. 左侧菜单栏动态溢出收纳 (常驻 DOM + 同步切换 display，消除大小屏切换时的闪烁) ───
const menuContainerRef = ref<HTMLElement | null>(null)
const ellipsisWrapRef = ref<HTMLElement | null>(null)
const visibleCount = ref(menus.length)
let menuItemEls: HTMLElement[] = []
let menuItemWidths: number[] = []
let resizeObserver: ResizeObserver | null = null

// 被隐藏的溢出菜单项（转为 NDropdown 级联子菜单结构，悬浮省略号时展示）
const overflowMenuOptions = computed<DropdownOption[]>(() =>
  menus.slice(visibleCount.value).map(menu => ({
    key: `overflow-${menu.key}`,
    label: menu.label,
    children: menu.options,
  })),
)

// 同步更新 DOM 显隐状态（在浏览器绘制前立即生效，避免异步重渲染导致的 1 帧闪烁）
function applyMenuVisibility(count: number) {
  for (let i = 0; i < menuItemEls.length; i++) {
    menuItemEls[i].style.display = i < count ? 'flex' : 'none'
  }
  if (ellipsisWrapRef.value) {
    ellipsisWrapRef.value.style.display = count < menus.length ? 'flex' : 'none'
  }
  if (visibleCount.value !== count) {
    visibleCount.value = count
  }
}

// 根据左侧可用宽度动态计算能展示几个菜单项
function updateVisibleMenus() {
  const container = menuContainerRef.value
  if (!container)
    return

  const availableWidth = container.clientWidth
  if (availableWidth <= 0)
    return

  // 首次可见时缓存所有菜单节点及其真实渲染宽度
  if (menuItemWidths.length === 0) {
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-menu-item]'))
    if (items.length === menus.length) {
      const widths = items.map(el => Math.ceil(el.getBoundingClientRect().width))
      if (widths.every(w => w > 0)) {
        menuItemEls = items
        menuItemWidths = widths
      }
    }
  }
  if (menuItemWidths.length === 0)
    return

  const GAP = 2 // 对应 gap-2px
  const ELLIPSIS_WIDTH = 26 // 省略号按钮宽度(24px) + 间距余量

  // 若全部菜单都能放下，直接全量展示（不显示省略号）
  const totalWidth = menuItemWidths.reduce((sum, w, i) => sum + w + (i > 0 ? GAP : 0), 0)
  if (totalWidth <= availableWidth) {
    applyMenuVisibility(menus.length)
    return
  }

  // 放不下时扣除省略号按钮宽度，从左到右累加计算可展示数量
  const maxWidth = availableWidth - ELLIPSIS_WIDTH
  let usedWidth = 0
  let count = 0
  for (const w of menuItemWidths) {
    if (usedWidth + w + GAP <= maxWidth) {
      usedWidth += w + GAP
      count++
    }
    else {
      break
    }
  }
  applyMenuVisibility(count)
}

// ─── 3. 居中全局搜索框逻辑 ───
const searchKeyword = ref('')
const isSearching = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

const searchPlaceholder = computed(() =>
  tpStore.fileName
    ? `${tpStore.fileName} (按 Ctrl+P 查找测试项)`
    : '打开 ATE 测试程序文件 (Ctrl+O)',
)

function startSearch() {
  isSearching.value = true
  nextTick(() => searchInputRef.value?.focus())
}

function handleSearchEsc() {
  searchKeyword.value = ''
  isSearching.value = false
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    startSearch()
  }
}

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

// ─── 4. 第二行快捷工具栏配置 (按业务语义分组，视觉层次清晰、间距舒适) ───
interface ToolbarItem {
  key: string
  icon: string
  tooltip: string
  class?: string
  onClick?: () => void
}

interface ToolbarGroup {
  key: string
  isCluster?: boolean // 是否采用微卡片胶囊包裹 (用于执行调试核心区)
  items: ToolbarItem[]
}

const toolbarGroups = computed<ToolbarGroup[]>(() => [
  // 1. 工程文件组
  {
    key: 'project',
    items: [
      { key: 'import', icon: 'ri:download-line', tooltip: '导入测试程序' },
      { key: 'open', icon: 'ri:folder-open-line', tooltip: '打开工程文件 (Ctrl+O)', onClick: () => tpStore.chooseAndOpenFile() },
      {
        key: 'save',
        icon: 'ri:save-line',
        tooltip: tpStore.isDirty ? '保存工程 (存在未保存改动 Ctrl+S)' : '保存工程 (Ctrl+S)',
        class: tpStore.isDirty ? 'text-amber-400 hover:text-amber-300 hover:!bg-amber-500/15' : undefined,
        onClick: () => tpStore.saveFile(),
      },
    ],
  },
  // 2. 硬件与规格配置组
  {
    key: 'config',
    items: [
      { key: 'chip', icon: 'ri:cpu-line', tooltip: '芯片管脚与规格配置 (PinMap / Levels)' },
    ],
  },
  // 3. 执行与调试控制组 (胶囊微卡片包裹，突出核心操作区)
  {
    key: 'execution',
    isCluster: true,
    items: [
      {
        key: 'run',
        icon: 'ri:play-circle-line',
        tooltip: '运行测试程序 (Run)',
        class: 'text-emerald-400 hover:text-emerald-300 hover:!bg-emerald-500/20 active:!bg-emerald-500/30',
        onClick: () => tpStore.runValidation(),
      },
      {
        key: 'step',
        icon: 'ri:eject-line',
        tooltip: '单步执行 (Step)',
        class: 'text-sky-400 hover:text-sky-300 hover:!bg-sky-500/20 active:!bg-sky-500/30',
      },
      {
        key: 'debug',
        icon: 'ri:bug-line',
        tooltip: '调试运行 (Debug)',
        class: 'text-amber-400 hover:text-amber-300 hover:!bg-amber-500/20 active:!bg-amber-500/30',
      },
      {
        key: 'stop',
        icon: 'ri:stop-circle-line',
        tooltip: '停止测试 (Stop)',
        class: 'text-rose-400 hover:text-rose-300 hover:!bg-rose-500/20 active:!bg-rose-500/30',
      },
    ],
  },
  // 4. 分析与 DRC 校验组
  {
    key: 'analysis',
    items: [
      { key: 'topology', icon: 'ri:node-tree', tooltip: '测试流拓扑图 (Topology)' },
      { key: 'validate', icon: 'ri:file-settings-line', tooltip: 'DRC 规则校验 (Validate)', onClick: () => tpStore.runValidation() },
    ],
  },
])

// ─── 5. 菜单指令与 Tauri 窗口控制 ───
function handleMenuSelect(optionKey: string) {
  switch (optionKey) {
    case 'open':
      tpStore.chooseAndOpenFile()
      break
    case 'save':
      tpStore.saveFile()
      break
    case 'preferences':
      tpStore.openSettingsTab()
      break
    case 'validate':
    case 'run-test':
      tpStore.runValidation()
      break
    case 'home':
      router.push('/home')
      break
    case 'toggle-sidebar':
      layoutStore.toggleSidebar()
      break
    case 'toggle-bottom':
      layoutStore.toggleBottomPanel()
      break
    case 'toggle-secondary':
      layoutStore.toggleSecondarySidebar()
      break
  }
}

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
</script>

<template>
  <header
    data-tauri-drag-region
    class="flex flex-col select-none border-b border-[#1e1e1e] text-xs font-sans"
    :style="{ backgroundColor: 'var(--wb-titlebar-bg, #2d2d2d)' }"
  >
    <!-- 第一行：三列对称网格布局 —— 保证中间搜索框严格按整个窗口居中，同时限制左侧菜单最大可用空间以触发自动收纳 -->
    <div
      data-tauri-drag-region
      class="grid h-30px items-center px-2"
      :style="{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }"
    >
      <!-- 左列：Logo + 自适应菜单栏 (超出左列空间时自动隐藏并显示省略号按钮) -->
      <div
        data-tauri-drag-region
        class="h-full min-w-0 flex items-center pr-2"
        :class="[isMac ? 'pl-14' : '']"
      >
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <div
              role="button"
              tabindex="0"
              class="mr-2 flex shrink-0 cursor-pointer items-center gap-1.5 text-white font-bold tracking-wide transition-opacity hover:opacity-80 focus:outline-none"
              @click="router.push('/home')"
            >
              <ProximaLogo :size="17" :show-shadow="false" />
              <span class="text-11px">Proxima</span>
            </div>
          </template>
          <span>返回 Proxima 首页</span>
        </NTooltip>

        <!-- 动态菜单容器：所有菜单常驻 DOM，通过同步切换 display 控制显隐，彻底消除大小屏突变时的重建闪烁 -->
        <div
          ref="menuContainerRef"
          data-tauri-drag-region
          class="h-full min-w-0 flex flex-1 items-center gap-2px overflow-hidden"
        >
          <div
            v-for="(menu, index) in menus"
            :key="menu.key"
            data-menu-item
            class="shrink-0 items-center"
            :style="{ display: index < visibleCount ? 'flex' : 'none' }"
          >
            <NDropdown
              trigger="click"
              placement="bottom-start"
              :options="menu.options"
              @select="handleMenuSelect"
            >
              <NButton
                quaternary
                size="tiny"
                class="text-gray-300 !h-22px !px-1.5 !text-11px hover:text-white"
              >
                <span class="mr-0.5">{{ menu.label }}</span>
                <SvgIcon icon="ri:arrow-down-s-line" class="text-10px text-gray-400" />
              </NButton>
            </NDropdown>
          </div>

          <!-- 溢出省略号按钮：常驻 DOM 避免销毁重建，鼠标悬浮(hover)展示被隐藏的菜单及其子项 -->
          <div
            ref="ellipsisWrapRef"
            class="shrink-0 items-center"
            :style="{ display: visibleCount < menus.length ? 'flex' : 'none' }"
          >
            <NDropdown
              trigger="hover"
              placement="bottom-start"
              :options="overflowMenuOptions"
              @select="handleMenuSelect"
            >
              <NButton
                quaternary
                size="tiny"
                class="shrink-0 text-gray-300 !h-22px !w-24px !p-0 hover:text-white"
              >
                <template #icon>
                  <SvgIcon icon="codicon:ellipsis" class="text-14px" />
                </template>
              </NButton>
            </NDropdown>
          </div>
        </div>
      </div>

      <!-- 中列：严格基于窗口宽度居中的搜索框 (内部长文本使用 NEllipsis 动态省略 + 悬浮提示) -->
      <div
        class="h-22px min-w-0 flex cursor-pointer items-center border border-[#3e3e42] rounded bg-[#1e1e1e] px-2 text-xs text-gray-300 shadow-inner transition-colors hover:border-blue-500/80"
        :style="{ width: 'clamp(140px, 30vw, 420px)' }"
        @click="startSearch"
      >
        <SvgIcon icon="ri:search-line" class="mr-1.5 shrink-0 text-12px text-gray-500" />

        <!-- 展示态：窗口变窄导致文本超长时自动省略，鼠标悬浮展示完整文字 -->
        <div v-if="!isSearching" class="min-w-0 flex flex-1 items-center overflow-hidden">
          <NEllipsis
            :tooltip="{ placement: 'bottom' }"
            class="w-full select-none text-11px"
            :class="searchKeyword ? 'text-white' : 'text-gray-400'"
          >
            {{ searchKeyword || searchPlaceholder }}
          </NEllipsis>
        </div>

        <!-- 输入态 -->
        <input
          v-else
          ref="searchInputRef"
          v-model="searchKeyword"
          type="text"
          :placeholder="searchPlaceholder"
          class="min-w-0 w-full flex-1 border-none bg-transparent text-11px text-white outline-none placeholder-gray-500"
          @click.stop
          @blur="isSearching = false"
          @keydown.esc.stop="handleSearchEsc"
          @keydown.enter.stop="isSearching = false"
        >

        <button
          v-if="searchKeyword"
          type="button"
          class="ml-1 shrink-0 p-0.5 text-gray-400 transition-colors hover:text-white"
          title="清空"
          @click.stop="searchKeyword = ''"
        >
          <SvgIcon icon="ri:close-line" class="text-11px" />
        </button>

        <span class="ml-1.5 shrink-0 select-none border border-[#444] rounded bg-[#2d2d2d] px-1 text-9px text-gray-400 font-mono">
          {{ isMac ? '⌘P' : 'Ctrl+P' }}
        </span>
      </div>

      <!-- 右列：当前工程标识与视图窗格控制 + 窗口控制按钮 -->
      <div
        data-tauri-drag-region
        class="h-full min-w-0 flex items-center justify-end gap-1.5 pl-2"
      >
        <!-- 当前工程标识与视图窗格控制 -->
        <div class="min-w-0 flex items-center gap-1.5">
          <div v-if="tpStore.fileName" class="max-w-160px min-w-0 flex items-center text-10px text-gray-400 font-mono">
            <NEllipsis :tooltip="{ placement: 'bottom' }">
              {{ tpStore.fileName }}
            </NEllipsis>
            <span v-if="tpStore.isDirty" class="ml-1 shrink-0 text-amber-400" title="存在未保存改动">●</span>
          </div>

          <NDivider v-if="tpStore.fileName" vertical class="shrink-0 !mx-1 !h-3.5" />

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton
                quaternary
                size="tiny"
                :type="layoutStore.sidebarVisible ? 'primary' : 'default'"
                :class="[layoutStore.sidebarVisible ? 'bg-white/10' : '']"
                class="shrink-0 !h-22px !w-22px !p-0"
                @click="layoutStore.toggleSidebar"
              >
                <template #icon>
                  <SvgIcon icon="ri:layout-left-line" class="text-13px" />
                </template>
              </NButton>
            </template>
            <span>切换主侧边栏 (Ctrl+B)</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton
                quaternary
                size="tiny"
                :type="layoutStore.bottomPanelVisible ? 'primary' : 'default'"
                :class="[layoutStore.bottomPanelVisible ? 'bg-white/10' : '']"
                class="shrink-0 !h-22px !w-22px !p-0"
                @click="layoutStore.toggleBottomPanel"
              >
                <template #icon>
                  <SvgIcon icon="ri:layout-bottom-line" class="text-13px" />
                </template>
              </NButton>
            </template>
            <span>切换底部面板 (Ctrl+J)</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton
                quaternary
                size="tiny"
                :type="layoutStore.secondarySidebarVisible ? 'primary' : 'default'"
                :class="[layoutStore.secondarySidebarVisible ? 'bg-white/10' : '']"
                class="shrink-0 !h-22px !w-22px !p-0"
                @click="layoutStore.toggleSecondarySidebar"
              >
                <template #icon>
                  <SvgIcon icon="ri:layout-right-line" class="text-13px" />
                </template>
              </NButton>
            </template>
            <span>切换辅助侧边栏 (Copilot)</span>
          </NTooltip>
        </div>

        <NDivider v-if="!isMac" vertical class="shrink-0 !mx-1 !h-3.5" />

        <div v-if="!isMac" class="flex shrink-0 items-center gap-0.5">
          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton
                quaternary
                size="tiny"
                class="text-gray-400 !h-22px !w-24px !p-0 hover:text-white"
                @click="handleMinimize"
              >
                <template #icon>
                  <SvgIcon icon="ri:subtract-line" class="text-12px" />
                </template>
              </NButton>
            </template>
            <span>最小化</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton
                quaternary
                size="tiny"
                class="text-gray-400 !h-22px !w-24px !p-0 hover:text-white"
                @click="handleToggleMaximize"
              >
                <template #icon>
                  <SvgIcon icon="ri:checkbox-multiple-blank-line" class="text-12px" />
                </template>
              </NButton>
            </template>
            <span>最大化 / 还原</span>
          </NTooltip>

          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton
                quaternary
                size="tiny"
                class="text-gray-400 !h-22px !w-24px !p-0 hover:!bg-red-600 hover:!text-white"
                @click="handleClose"
              >
                <template #icon>
                  <SvgIcon icon="ri:close-line" class="text-13px" />
                </template>
              </NButton>
            </template>
            <span>关闭</span>
          </NTooltip>
        </div>
      </div>
    </div>

    <!-- 第二行：快捷工具栏 (按功能模块清晰分组，兼具视觉节奏与点击舒适度) -->
    <div
      class="h-30px flex items-center justify-between border-t border-[#1e1e1e] bg-[#222222]/90 px-3"
    >
      <!-- 左侧：常用功能快捷图标组 -->
      <div class="flex items-center">
        <template v-for="(group, gIndex) in toolbarGroups" :key="group.key">
          <!-- 分组间微细分隔竖线 (8px 间距，细腻居中) -->
          <div
            v-if="gIndex > 0"
            class="mx-2 h-3.5 w-1px shrink-0 bg-white/12"
          />

          <!-- 运行调试核心控制组：胶囊微卡片包裹，突出核心操作区 -->
          <div
            v-if="group.isCluster"
            class="flex items-center gap-0.5 border border-white/[0.08] rounded-md bg-black/25 px-1 py-0.5 shadow-inner"
          >
            <NTooltip
              v-for="action in group.items"
              :key="action.key"
              placement="bottom"
              trigger="hover"
            >
              <template #trigger>
                <NButton
                  quaternary
                  size="tiny"
                  class="shrink-0 rounded transition-all duration-150 !h-22px !w-22px active:scale-95 !p-0"
                  :class="action.class"
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

          <!-- 常规功能图标组：舒适 24px 触控区，4px 组内间距 -->
          <div v-else class="flex items-center gap-1">
            <NTooltip
              v-for="action in group.items"
              :key="action.key"
              placement="bottom"
              trigger="hover"
            >
              <template #trigger>
                <NButton
                  quaternary
                  size="tiny"
                  class="shrink-0 rounded transition-all duration-150 !h-24px !w-24px active:scale-95 !p-0"
                  :class="action.class || 'text-gray-300 hover:text-white hover:!bg-white/10'"
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

      <!-- 右侧：当前运行适配器 / 环境状态小标 (与快捷图标区呼应，增强工具栏饱满度) -->
      <div v-if="tpStore.activeAdapter" class="hidden items-center gap-1.5 text-10px text-gray-400 font-mono sm:flex">
        <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span class="text-gray-300">{{ tpStore.activeAdapter.name }}</span>
      </div>
    </div>
  </header>
</template>
