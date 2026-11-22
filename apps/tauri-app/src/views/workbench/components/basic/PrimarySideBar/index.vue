<script setup lang="ts">
import type { GlobalThemeOverrides, TreeOption } from 'naive-ui'
import type { TPTreeNode } from '@/core/tpModule'
import { SvgIcon } from '@sa/components'
import { computed, h, ref, shallowRef, watch } from 'vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import { getTreeErrorCounts } from '@/core/tree-errors'
import { useThemeStore } from '@/store/modules/theme'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { getUiFontSize } from '@/theme/typography'
import { getDemoTreeErrorCounts } from './tree-error-demo'

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
    /** 初始宽度 (默认 248) */
    initialWidth?: number
    /** 最小宽度 (默认 200) */
    minWidth?: number
    /** 最大宽度 (默认 500) */
    maxWidth?: number
    /** 节点单行高度 (默认 28px 工业标准行高) */
    nodeHeight?: number
    /** 缩进层级宽度 (默认 16px) */
    indent?: number
  }>(),
  {
    treeData: undefined,
    activeNodeId: undefined,
    initialWidth: 248,
    minWidth: 200,
    maxWidth: 500,
    nodeHeight: 28,
    indent: 16,
  },
)

const emit = defineEmits<{
  (e: 'nodeClick', node: TPTreeNode): void
  (e: 'update:activeNodeId', id: string): void
}>()

const layoutStore = useWorkbenchLayoutStore()
const tpStore = useTpStore()

// ─── 1. 侧边栏宽度与拉伸逻辑 ───
const sidebarWidth = ref<number>(props.initialWidth)
const isResizing = ref(false)

// ─── 2. 节点树数据与展开逻辑 ───
/** 当前展开的目录节点 ID 列表 */
const expandedKeys = ref<string[]>([])
/** 替换工程树时重建 NTree，清除上一个数据源的展开动画缓存。 */
const treeVersion = shallowRef(0)

/** 当前生效的树形数据源 */
const sourceTree = computed(() => props.treeData ?? tpStore.treeData)
// 工程当前尚无异常计数来源，提供明确标注且可关闭的效果演示。
const showErrorDemo = shallowRef(true)
const canShowErrorDemo = computed(() => !props.treeData && tpStore.activeAdapter?.id === 'adapter.proxima-project')
/** 异常变化只更新计数，不重建源树，保留用户的展开与选中状态。 */
const nodeErrorCounts = computed(() => canShowErrorDemo.value && showErrorDemo.value
  ? getDemoTreeErrorCounts(sourceTree.value)
  : getTreeErrorCounts(sourceTree.value, props.treeData ? [] : tpStore.validationResult.issues))
/** 当前生效的选中节点 ID */
const currentActiveNodeId = computed(() => (props.activeNodeId !== undefined ? props.activeNodeId : tpStore.activeNodeId))

/** ATE 工业树组件主题变量，遵循 UI 设计规范（树节点基准 13px，最小行高 28px） */
const themeStore = useThemeStore()
const treeFontSize = computed(() => getUiFontSize(13, themeStore.fontSize))
const treeNodeHeight = computed(() => Math.max(props.nodeHeight, Math.ceil(treeFontSize.value * 1.4 + 10)))
const treeThemeOverrides = computed<NonNullable<GlobalThemeOverrides['Tree']>>(() => ({
  nodeHeight: `${treeNodeHeight.value}px`,
  nodeWrapperPadding: '1px 0',
  nodeBorderRadius: 'var(--theme-radius)',
  nodeColorHover: 'var(--hover-color)',
  nodeColorPressed: 'var(--active-color)',
  nodeColorActive: 'var(--active-color)',
  nodeTextColor: 'rgb(var(--base-text-color))',
  nodeTextColorDisabled: 'var(--text-muted)',
  arrowColor: 'var(--text-muted)',
  lineColor: 'var(--border-color)',
  fontSize: `${treeFontSize.value}px`,
  lineHeight: '1.4',
}))

/** 递归查找树中的首个叶子测试项节点 (非 folder 节点) */
function findFirstLeafNode(nodes: TPTreeNode[]): TPTreeNode | null {
  for (const node of nodes) {
    if (node.nodeType === 'file' && !node.disabled) {
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

/** 找到选中节点的祖先路径；节点不存在时返回 null，顶级节点返回空路径。 */
function findAncestorKeys(nodes: TPTreeNode[], id: string): string[] | null {
  for (const node of nodes) {
    if (node.id === id)
      return []
    const ancestors = node.children && findAncestorKeys(node.children, id)
    if (ancestors)
      return [node.id, ...ancestors]
  }
  return null
}

/** 工程树初始化时只展开选中路径；后续手动展开/收起由 NTree 的 v-model 管理。 */
watch(
  sourceTree,
  (newTree) => {
    treeVersion.value += 1
    const currentPath = findAncestorKeys(newTree, currentActiveNodeId.value)
    const needsDefault = currentPath === null || (!props.treeData && tpStore.tabs.length === 0)
    const firstNode = needsDefault ? findFirstLeafNode(newTree) : null
    expandedKeys.value = firstNode
      ? findAncestorKeys(newTree, firstNode.id) ?? []
      : currentPath ?? []

    if (firstNode) {
      emit('nodeClick', firstNode)
      emit('update:activeNodeId', firstNode.id)
      if (!props.treeData)
        tpStore.openTab(firstNode)
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
  const isFolder = node.nodeType === 'folder'
  const errorCount = nodeErrorCounts.value.get(node.id) ?? 0
  // 汇总数用于角标；扣除子节点的异常后，仅自身报错的节点标红。
  const childErrorCount = (node.children ?? []).reduce((sum, child) => sum + (nodeErrorCounts.value.get(child.id) ?? 0), 0)
  return {
    title: `${node.description || node.label}${errorCount > 0 ? ` · ${errorCount} 个异常` : ''}`,
    class: [
      isFolder ? 'ate-tree-node--folder' : 'ate-tree-node--item',
      errorCount > childErrorCount && 'ate-tree-node--error',
    ],
    onClick: () => {
      if (node.disabled)
        return
      if (isFolder) {
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

/** 业务分类保留语义图标；只有通用文件夹随展开状态切换。 */
function renderPrefix({ option }: { option: TreeOption }) {
  const node = option as unknown as TPTreeNode
  const isFolder = node.nodeType === 'folder'
  const isExpanded = expandedKeys.value.includes(node.id)
  const isGenericFolder = isFolder && (!node.icon || node.icon === 'ri:folder-line')
  const icon = isGenericFolder
    ? (isExpanded ? 'ri:folder-open-line' : 'ri:folder-line')
    : (node.icon || 'ri:file-code-line')
  const iconColor = isFolder ? 'text-warning' : 'text-primary'

  return h(SvgIcon, {
    icon,
    class: `text-ui-16 shrink-0 ${iconColor}`,
  })
}

/** 后缀独立占位，长节点名截断时仍能看到完整异常数量。 */
function renderSuffix({ option }: { option: TreeOption }) {
  const node = option as unknown as TPTreeNode
  const count = nodeErrorCounts.value.get(node.id) ?? 0
  return count > 0
    ? h('span', {
        'class': 'ate-tree-error-badge text-ui-12',
        'aria-label': `${count} 个异常`,
      }, String(count))
    : null
}
</script>

<template>
  <div class="h-full flex shrink-0 items-center">
    <!-- 主侧边栏 ATE 工业导航面板 (仅保留 NTree) -->
    <aside
      :style="{
        width: layoutStore.sidebarVisible ? `${sidebarWidth}px` : '0px',
        opacity: layoutStore.sidebarVisible ? 1 : 0,
      }"
      class="z-20 h-full flex flex-col shrink-0 select-none overflow-hidden border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container text-base-text"
      :class="[
        layoutStore.sidebarVisible && 'ml-4px border',
        !isResizing ? 'transition-[width,opacity] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]' : '',
      ]"
    >
      <!-- 内部固定宽度容器，防止折叠过渡时内容挤压换行 -->
      <div
        :style="{ width: `${sidebarWidth}px` }"
        class="h-full flex flex-col shrink-0 overflow-hidden text-ui-13"
      >
        <div
          v-if="canShowErrorDemo"
          class="flex shrink-0 items-center justify-between gap-8px border-b border-[var(--border-color)] px-12px py-6px text-ui-12"
        >
          <span class="text-[var(--text-muted)]">模拟异常</span>
          <NSwitch v-model:value="showErrorDemo" size="small" aria-label="模拟异常角标" />
        </div>
        <div class="flex-1 overflow-x-hidden overflow-y-auto px-8px py-8px">
          <NTree
            :key="treeVersion"
            v-model:expanded-keys="expandedKeys"
            block-line
            show-line
            :indent="indent"
            :theme-overrides="treeThemeOverrides"
            :data="(sourceTree as any)"
            :selected-keys="currentActiveNodeId ? [currentActiveNodeId] : []"
            :node-props="nodeProps"
            :render-prefix="renderPrefix"
            :render-suffix="renderSuffix"
            key-field="id"
            label-field="label"
            children-field="children"
            class="ate-workbench-tree"
          />
        </div>
      </div>
    </aside>

    <!-- 主侧边栏显示时可拖拽调节宽度 -->
    <ResizeHandle
      v-show="layoutStore.sidebarVisible"
      v-model="sidebarWidth"
      direction="col"
      :min="minWidth"
      :max="maxWidth"
      title="拖拽调节宽度"
      @start="isResizing = true"
      @end="isResizing = false"
    />
  </div>
</template>

<style scoped>
/* 节点行基础排版与网格对齐 */
:deep(.ate-workbench-tree .n-tree-node) {
  position: relative;
  border-radius: var(--theme-radius);
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

:deep(.ate-workbench-tree .n-tree-node-content) {
  min-width: 0;
  padding-left: 4px;
  padding-right: 8px;
  font-size: inherit;
  border-radius: var(--theme-radius);
  transition: color 150ms ease;
}

/* 展开箭头固定栅格尺寸，确保各级图标垂直对齐 */
:deep(.ate-workbench-tree .n-tree-node-switcher) {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 前缀图标固定槽位与间距 (4px~6px 标准图标文字间距) */
:deep(.ate-workbench-tree .n-tree-node-content__prefix) {
  width: 20px;
  margin-right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 节点文本单行截断，防止长硬件槽位或测试项名称换行撑乱行高 */
:deep(.ate-workbench-tree .n-tree-node-content__text) {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 工业分类目录节点与业务叶子节点字重层级区分 */
:deep(.ate-workbench-tree .ate-tree-node--folder .n-tree-node-content__text) {
  font-weight: 500;
  color: rgb(var(--base-text-color));
}

:deep(.ate-workbench-tree .ate-tree-node--item .n-tree-node-content__text) {
  font-weight: 400;
  color: rgb(var(--base-text-color) / 0.88);
}

/* 选中态：保留高亮色与左侧 2px 主色工业指示条，悬停时指示不丢失 */
:deep(.ate-workbench-tree .n-tree-node--selected) {
  background-color: var(--active-color);
  box-shadow: inset 2px 0 0 rgb(var(--primary-color));
}

:deep(.ate-workbench-tree .n-tree-node--selected .n-tree-node-content__text) {
  font-weight: 500;
  color: rgb(var(--base-text-color));
}

/* 异常底色优先于普通选中/悬停色，选中节点仍保留左侧主色指示条。 */
:deep(.ate-workbench-tree .n-tree-node.ate-tree-node--error) {
  background-color: rgb(var(--error-color) / 0.16);
}

:deep(.ate-workbench-tree .n-tree-node.ate-tree-node--error:hover),
:deep(.ate-workbench-tree .n-tree-node.ate-tree-node--error.n-tree-node--selected) {
  background-color: rgb(var(--error-color) / 0.24);
}

:deep(.ate-workbench-tree .n-tree-node-content__suffix) {
  flex-shrink: 0;
  margin-left: 8px;
}

:deep(.ate-tree-error-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 0 4px;
  border: 1px solid rgb(var(--error-color) / 0.6);
  border-radius: var(--theme-radius);
  background-color: rgb(var(--error-color) / 0.18);
  color: rgb(var(--base-text-color));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  white-space: nowrap;
}

/* 禁用态（如未配置的外部波形工具）：降低透明度但保持可读 */
:deep(.ate-workbench-tree .n-tree-node--disabled .n-tree-node-content__text) {
  color: var(--text-muted);
}

/* 键盘无障碍焦点环 */
:deep(.ate-workbench-tree .n-tree-node:focus-visible) {
  outline: 2px solid rgb(var(--primary-color));
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.ate-workbench-tree .n-tree-node),
  :deep(.ate-workbench-tree .n-tree-node-content) {
    transition: none;
  }
}
</style>
