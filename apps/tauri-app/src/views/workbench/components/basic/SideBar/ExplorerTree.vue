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
  <div class="h-full flex flex-col select-none overflow-hidden text-xs">
    <!-- 过滤输入框 -->
    <div class="shrink-0 border-b border-[#2d2d2d] p-2">
      <div class="flex items-center border border-[#3e3e42] rounded bg-[#1e1e1e] px-2 py-1 text-gray-300">
        <SvgIcon icon="ri:search-line" class="mr-1.5 text-12px text-gray-500" />
        <input
          v-model="filterKeyword"
          type="text"
          placeholder="过滤测试项或管脚..."
          class="w-full border-none bg-transparent text-11px text-white outline-none placeholder-gray-500"
        >
        <button
          v-if="filterKeyword"
          type="button"
          class="text-gray-500 hover:text-white"
          @click="filterKeyword = ''"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 树主体 -->
    <div class="flex-1 overflow-auto p-1.5">
      <div v-if="displayTree.length === 0" class="p-4 text-center text-xs text-gray-500">
        <div class="mb-2">
          📄 暂未打开测试文件
        </div>
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="cursor-pointer rounded bg-blue-600 px-2.5 py-1 text-11px text-white transition-colors hover:bg-blue-500"
            @click="tpStore.chooseAndOpenFile"
          >
            打开本地 JSON
          </button>
          <button
            type="button"
            class="cursor-pointer border border-[#444] rounded bg-[#2d2d2d] px-2.5 py-1 text-11px text-gray-200 transition-colors hover:bg-[#3e3e42]"
            @click="tpStore.loadSampleData"
          >
            载入演示测试程序
          </button>
        </div>
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
