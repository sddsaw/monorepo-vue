<script setup lang="ts">
import type { TPTreeNode } from '@/core/tpModule'
import { computed, ref, watch } from 'vue'
import { useTpStore } from '@/store/modules/tp'

const tpStore = useTpStore()
const filterKeyword = ref('')
const expandedKeys = ref<string[]>([])

// 默认全展开顶级目录
watch(
  () => tpStore.treeData,
  (newTree) => {
    if (newTree && newTree.length > 0) {
      expandedKeys.value = newTree.filter(n => n.nodeType === 'folder').map(n => n.id)
    }
  },
  { immediate: true },
)

function toggleExpand(id: string) {
  const idx = expandedKeys.value.indexOf(id)
  if (idx > -1) {
    expandedKeys.value.splice(idx, 1)
  }
  else {
    expandedKeys.value.push(id)
  }
}

/** 拦截整行节点点击，严格分流 folder 与 file */
function nodeProps({ option }: { option: any }) {
  const node = option as TPTreeNode
  return {
    onClick: () => {
      if (node.nodeType === 'folder') {
        // 文件夹节点：点击整行仅触发展开与收起，绝对不打开右侧标签页
        toggleExpand(node.id)
      }
      else {
        // 文件测试项节点：触发工作区打开对应自定义业务组件
        tpStore.openTab(node)
      }
    },
  }
}

const displayTree = computed(() => {
  if (!filterKeyword.value)
    return tpStore.treeData
  const q = filterKeyword.value.toLowerCase()

  function filterNodes(nodes: TPTreeNode[]): TPTreeNode[] {
    const res: TPTreeNode[] = []
    for (const node of nodes) {
      const matchSelf = node.label.toLowerCase().includes(q)
      if (node.children) {
        const matchedChildren = filterNodes(node.children)
        if (matchedChildren.length > 0 || matchSelf) {
          res.push({ ...node, children: matchedChildren })
        }
      }
      else if (matchSelf) {
        res.push(node)
      }
    }
    return res
  }

  return filterNodes(tpStore.treeData)
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden text-xs select-none">
    <!-- 过滤输入框 -->
    <div class="p-2 border-b border-[#2d2d2d] shrink-0">
      <div class="flex items-center bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-gray-300">
        <SvgIcon icon="ri:search-line" class="text-gray-500 mr-1.5 text-12px" />
        <input
          v-model="filterKeyword"
          type="text"
          placeholder="过滤测试项或管脚..."
          class="w-full bg-transparent border-none outline-none text-11px text-white placeholder-gray-500"
        />
        <button
          v-if="filterKeyword"
          type="button"
          @click="filterKeyword = ''"
          class="text-gray-500 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 树主体 -->
    <div class="flex-1 overflow-auto p-1.5">
      <div v-if="displayTree.length === 0" class="p-4 text-center text-gray-500 text-xs">
        <div class="mb-2">📄 暂未打开测试文件</div>
        <button
          type="button"
          @click="tpStore.chooseAndOpenFile"
          class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-11px transition-colors cursor-pointer"
        >
          打开本地 JSON
        </button>
      </div>

      <NTree
        v-else
        block-line
        :data="(displayTree as any)"
        :expanded-keys="expandedKeys"
        :selected-keys="[tpStore.activeNodeId]"
        :node-props="nodeProps"
        key-field="id"
        label-field="label"
        children-field="children"
        class="ate-workbench-tree"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.n-tree-node-content) {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  font-size: 12px !important;
}
</style>
