<script setup lang="ts">
import { computed } from 'vue'
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary.vue'
import FallbackJsonView from '@/components/common/FallbackJsonView.vue'
import { TP_COMPONENTS } from '@/constants/tpRegistry'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'MainContent',
})

const tpStore = useTpStore()

const currentTab = computed(() => tpStore.activeTab)

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
    :style="{ backgroundColor: 'var(--wb-editor-bg, #1e1e1e)' }"
    class="relative size-full overflow-hidden"
  >
    <!-- 空状态提示 (未打开任何测试项时展示) -->
    <div
      v-if="!currentTab"
      class="size-full flex flex-col select-none items-center justify-center text-13px text-[#858585]"
    >
      <div class="mb-8px text-28px opacity-40">
        📄
      </div>
      <span>未打开任何测试项</span>
    </div>

    <!-- 业务组件主展示区 -->
    <div v-else class="size-full overflow-auto">
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
