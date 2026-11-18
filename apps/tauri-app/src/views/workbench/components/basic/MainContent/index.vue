<script setup lang="ts">
import type { WbTabItem } from '@/store/modules/tp'
import { computed } from 'vue'
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary.vue'
import FallbackJsonView from '@/components/common/FallbackJsonView.vue'
import { TP_COMPONENTS } from '@/constants/tpRegistry'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'MainContent',
})

// 由父级按标签 ID 挂载，离场动画期间仍使用原标签的数据。
const props = defineProps<{ tab?: WbTabItem }>()

const tpStore = useTpStore()

const currentTab = computed(() => props.tab)

const currentData = computed(() => {
  if (!currentTab.value)
    return undefined
  return tpStore.getItemData(currentTab.value.dataPath)
})

const MatchedComponent = computed(() => {
  if (!currentTab.value)
    return undefined
  return (TP_COMPONENTS as Record<string, any>)[currentTab.value.componentKey]
})
</script>

<template>
  <div
    :style="{ backgroundColor: 'rgb(var(--container-bg-color))' }"
    class="relative min-h-full"
  >
    <!-- 空状态提示 (未打开任何测试项时展示) -->
    <div
      v-if="!currentTab"
      class="min-h-240px flex flex-col select-none items-center justify-center text-[var(--text-muted)] text-ui-13"
    >
      <div class="mb-8px opacity-40 text-ui-28">
        📄
      </div>
      <span>未打开任何测试项</span>
    </div>

    <!-- 业务组件主展示区 -->
    <div v-else>
      <ComponentErrorBoundary
        :key="currentTab.id"
        :node-id="currentTab.id"
        :node-label="currentTab.label"
        :component-key="currentTab.componentKey"
        :file-name="tpStore.fileName"
        :data-path="currentTab.dataPath"
        :raw-data="currentData"
      >
        <component
          :is="MatchedComponent"
          v-if="MatchedComponent && currentData"
          :data="currentData"
          :data-path="currentTab.dataPath"
        />
        <FallbackJsonView
          v-else
          :missing-key="currentTab.componentKey"
          :raw-data="currentData"
          :data-path="currentTab.dataPath"
        />
      </ComponentErrorBoundary>
    </div>
  </div>
</template>
