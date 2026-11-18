<script setup lang="ts">
import type { GlobalThemeOverrides, TreeOption } from 'naive-ui'
import type { TPTreeNode } from '@/core/tpModule'
import { SvgIcon } from '@sa/components'
import { computed, h, onMounted, ref, watch } from 'vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import { useThemeStore } from '@/store/modules/theme'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { getUiFontSize } from '@/theme/typography'

export type { TPTreeNode }

defineOptions({
  name: 'PrimarySideBar',
})

const props = withDefaults(
  defineProps<{
    /** 树形数据源（若传入则优先使用外部数据，未传入时使用 tpStore.treeData） */
    treeData?: TPTreeNode[]
    /** 当前激活选中的节点 ID */
    activeNodeId?: string
    /** 顶部搜索过滤框占位提示文本 */
    placeholder?: string
    /** 是否在当前无工程打开时默认自动加载演示测试程序 (默认 true) */
    autoLoadSample?: boolean
    /** 初始宽度 (默认 240) */
    initialWidth?: number
    /** 最小宽度 (默认 200) */
    minWidth?: number
    /** 最大宽度 (默认 500) */
    maxWidth?: number
    /** 节点单行高度 (默认 22px 紧凑模式) */
    nodeHeight?: number
    /** 缩进层级宽度 (默认 16px) */
    indent?: number
  }>(),
  {
    treeData: undefined,
    activeNodeId: undefined,
    placeholder: '过滤测试项或管脚...',
    autoLoadSample: true,
    initialWidth: 240,
    minWidth: 200,
    maxWidth: 500,
    nodeHeight: 22,
    indent: 16,
  },
)

const emit = defineEmits<{
  (e: 'nodeClick', node: TPTreeNode): void
  (e: 'update:activeNodeId', id: string): void
}>()

const layoutStore = useWorkbenchLayoutStore()
const tpStore = useTpStore()

// ─── 1. 侧边栏宽度与拉伸收起逻辑 ───
const sidebarWidth = ref<number>(props.initialWidth)
const isResizing = ref(false)

/** 向左拖拽超过阈值时触发平滑收起 */
function handleCollapse() {
  layoutStore.setSidebarVisible(false)
  isResizing.value = false
  sidebarWidth.value = props.initialWidth
}

/** 折叠状态下向右拖拽手柄时重新展开侧边栏 */
function handleExpand() {
  layoutStore.setSidebarVisible(true)
}

// ─── 2. 节点树数据过滤与展开收起逻辑 ───
/** 节点过滤关键字 */
const filterKeyword = ref('')
/** 当前展开的目录节点 ID 列表 */
const expandedKeys = ref<string[]>([])

/** 当前生效的树形数据源 */
const sourceTree = computed(() => props.treeData ?? tpStore.treeData)
/** 当前生效的选中节点 ID */
const currentActiveNodeId = computed(() => (props.activeNodeId !== undefined ? props.activeNodeId : tpStore.activeNodeId))

/** 紧凑型树组件主题变量，匹配标准 IDE 高度与间距 */
const themeStore = useThemeStore()
const treeFontSize = computed(() => getUiFontSize(12, themeStore.fontSize))
const treeNodeHeight = computed(() => Math.max(props.nodeHeight, Math.ceil(treeFontSize.value * 1.5 + 4)))
const treeThemeOverrides = computed<NonNullable<GlobalThemeOverrides['Tree']>>(() => ({
  nodeHeight: `${treeNodeHeight.value}px`,
  nodeWrapperPadding: '1px 0',
  fontSize: `${treeFontSize.value}px`,
  lineHeight: '1.5',
}))

/** 递归查找树中的首个叶子测试项节点 (非 folder 节点) */
function findFirstLeafNode(nodes: TPTreeNode[]): TPTreeNode | null {
  for (const node of nodes) {
    if (node.nodeType === 'file') {
      return node
    }
    if (node.children?.length) {
      const child = findFirstLeafNode(node.children)
      if (child) {
        return child
      }
    }
    else if (node.nodeType !== 'folder') {
      return node
    }
  }
  return null
}

/** 默认自动展开所有顶级目录，并默认加载并打开第一个子集节点 */
watch(
  () => sourceTree.value,
  (newTree) => {
    if (newTree?.length) {
      expandedKeys.value = newTree.filter(n => n.nodeType === 'folder').map(n => n.id)

      // 若当前尚未选中任何节点或未打开 Tab，默认加载树下的第一个子集节点
      if (!currentActiveNodeId.value || tpStore.tabs.length === 0) {
        const firstLeaf = findFirstLeafNode(newTree)
        if (firstLeaf) {
          emit('nodeClick', firstLeaf)
          emit('update:activeNodeId', firstLeaf.id)
          if (!props.treeData) {
            tpStore.openTab(firstLeaf)
          }
        }
      }
    }
  },
  { immediate: true },
)

/** 切换目录展开/收起状态 */
function toggleExpand(id: string) {
  const idx = expandedKeys.value.indexOf(id)
  if (idx > -1) {
    expandedKeys.value.splice(idx, 1)
  }
  else {
    expandedKeys.value.push(id)
  }
}

/** 拦截整行节点点击：目录类型仅展开/折叠，文件类型打开对应工作区 Tab 并派发事件 */
function nodeProps({ option }: { option: TreeOption }) {
  const node = option as unknown as TPTreeNode
  return {
    onClick: () => {
      if (node.nodeType === 'folder') {
        toggleExpand(node.id)
      }
      else {
        emit('nodeClick', node)
        emit('update:activeNodeId', node.id)
        // 若未传入自定义外部 treeData，则执行工作台默认打开 Tab 行为
        if (!props.treeData) {
          tpStore.openTab(node)
        }
      }
    },
  }
}

/** 渲染节点前缀图标：根据目录展开状态或节点类型动态呈现 */
function renderPrefix({ option }: { option: TreeOption }) {
  const node = option as unknown as TPTreeNode
  const isFolder = node.nodeType === 'folder'
  const isExpanded = expandedKeys.value.includes(node.id)
  const icon = isFolder
    ? (isExpanded ? 'ri:folder-open-line' : (node.icon || 'ri:folder-line'))
    : (node.icon || 'ri:file-code-line')
  const iconColor = isFolder ? 'text-warning' : 'text-primary'

  return h(SvgIcon, {
    icon,
    class: `text-ui-13 shrink-0 ${iconColor}`,
  })
}

/** 递归过滤节点树 */
function filterNodes(nodes: TPTreeNode[], query: string): TPTreeNode[] {
  const result: TPTreeNode[] = []
  for (const node of nodes) {
    const isMatched = node.label.toLowerCase().includes(query)
    if (node.children?.length) {
      const filteredChildren = filterNodes(node.children, query)
      if (filteredChildren.length > 0 || isMatched) {
        result.push({ ...node, children: filteredChildren })
      }
    }
    else if (isMatched) {
      result.push(node)
    }
  }
  return result
}

/** 响应式过滤树数据源 */
const displayTree = computed(() => {
  const query = filterKeyword.value.trim().toLowerCase()
  if (!query)
    return sourceTree.value
  return filterNodes(sourceTree.value, query)
})

/** 搜索时自动展开匹配命中的父级目录 */
watch(filterKeyword, (val) => {
  if (!val.trim())
    return
  const expandSet = new Set(expandedKeys.value)
  const collectFolderIds = (nodes: TPTreeNode[]) => {
    for (const node of nodes) {
      if (node.children?.length) {
        expandSet.add(node.id)
        collectFolderIds(node.children)
      }
    }
  }
  collectFolderIds(displayTree.value)
  expandedKeys.value = Array.from(expandSet)
})

/** 挂载时若无已打开工程且启用了 autoLoadSample，默认直接加载演示测试程序 */
onMounted(async () => {
  if (
    props.autoLoadSample
    && !props.treeData
    && tpStore.treeData.length === 0
    && !tpStore.filePath
  ) {
    await tpStore.loadSampleData()
  }
})
</script>

<template>
  <div class="h-full flex shrink-0 items-center">
    <!-- 主侧边栏圆角浮动卡片面板 (包含搜索栏与资源管理器树) -->
    <aside
      :style="{
        width: layoutStore.sidebarVisible ? `${sidebarWidth}px` : '0px',
        opacity: layoutStore.sidebarVisible ? 1 : 0,
        backgroundColor: 'rgb(var(--layout-bg-color))',
        borderColor: 'var(--border-color)',
      }"
      class="z-20 h-full flex flex-col shrink-0 select-none overflow-hidden rounded-[var(--theme-radius)] text-[var(--text-muted)]"
      :class="[
        layoutStore.sidebarVisible && 'ml-4px border',
        !isResizing ? 'transition-[width,opacity] duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]' : '',
      ]"
    >
      <!-- 内部固定宽度容器，防止折叠动画时内容换行错位 -->
      <div
        :style="{ width: `${sidebarWidth}px` }"
        class="h-full flex flex-col shrink-0 overflow-hidden leading-16px text-ui-12"
      >
        <!-- 顶部过滤搜索栏 -->
        <slot name="header">
          <div class="shrink-0 border-b border-[var(--border-color)] p-8px">
            <NInput
              v-model:value="filterKeyword"
              size="tiny"
              clearable
              :placeholder="placeholder"
            >
              <template #prefix>
                <SvgIcon icon="ri:search-line" class="text-[var(--text-muted)] text-ui-12" />
              </template>
            </NInput>
          </div>
        </slot>

        <!-- 树主体与空状态容器 -->
        <div class="flex-1 overflow-auto px-4px py-4px">
          <!-- 空状态引导 -->
          <slot v-if="displayTree.length === 0" name="empty">
            <div class="p-16px text-center text-[var(--text-muted)] text-ui-12">
              <div class="mb-8px">
                📄 暂未打开测试文件
              </div>
              <div class="flex flex-col gap-8px">
                <button
                  type="button"
                  class="cursor-pointer rounded-4px bg-primary px-10px py-4px text-base-text transition-colors text-ui-11 hover:bg-primary"
                  @click="tpStore.chooseAndOpenFile"
                >
                  打开本地 JSON
                </button>
                <button
                  type="button"
                  class="cursor-pointer border border-[var(--border-color)] rounded-4px bg-layout px-10px py-4px text-base-text transition-colors text-ui-11 hover:bg-container"
                  @click="tpStore.loadSampleData"
                >
                  载入演示测试程序
                </button>
              </div>
            </div>
          </slot>

          <!-- 目录树组件 -->
          <NTree
            v-else
            v-model:expanded-keys="expandedKeys"
            show-line
            block-line
            :indent="indent"
            :theme-overrides="treeThemeOverrides"
            :data="(displayTree as any)"
            :selected-keys="currentActiveNodeId ? [currentActiveNodeId] : []"
            :node-props="nodeProps"
            :render-prefix="renderPrefix"
            key-field="id"
            label-field="label"
            children-field="children"
            class="ate-workbench-tree"
          />
        </div>
      </div>
    </aside>

    <!-- 最右侧间距与拖拽拉伸手柄 (常驻显示：展开时可向左拖拽收起，折叠后仍可向右拖拽重新拉开) -->
    <ResizeHandle
      v-model="sidebarWidth"
      direction="col"
      :min="minWidth"
      :max="maxWidth"
      :collapsed="!layoutStore.sidebarVisible"
      :collapse-threshold="160"
      :expand-threshold="40"
      :title="layoutStore.sidebarVisible ? '拖拽调节宽度 (向左拖拽收起)' : '向右拖拽或双击展开侧边栏'"
      @start="isResizing = true"
      @end="isResizing = false"
      @collapse="handleCollapse"
      @expand="handleExpand"
      @dblclick="!layoutStore.sidebarVisible && handleExpand()"
    />
  </div>
</template>

<style scoped>
:deep(.ate-workbench-tree .n-tree-node-content) {
  padding-left: 2px;
  padding-right: 4px;
  font-size: inherit;
}

:deep(.ate-workbench-tree .n-tree-node-content__prefix) {
  margin-right: 5px;
}

:deep(.ate-workbench-tree .n-tree-node-switcher__icon) {
  font-size: max(11px, calc(var(--app-font-size) * 12 / 14));
}
</style>
