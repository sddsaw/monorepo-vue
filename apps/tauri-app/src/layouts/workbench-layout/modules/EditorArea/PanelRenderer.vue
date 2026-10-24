<script setup lang="ts">
import { computed } from 'vue'
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary.vue'
import FallbackJsonView from '@/components/common/FallbackJsonView.vue'
import { TP_COMPONENTS } from '@/constants/tpRegistry'
import { useTpStore } from '@/store/modules/tp'

const props = defineProps<{
  params: {
    nodeId: string
    componentKey: string
    dataPath: (string | number)[]
    label: string
  }
}>()

const tpStore = useTpStore()

const currentData = computed(() => {
  return tpStore.getItemData(props.params.dataPath)
})

const MatchedComponent = computed(() => {
  return (TP_COMPONENTS as any)[props.params.componentKey]
})
</script>

<template>
  <div class="size-full overflow-auto bg-[#1e1e1e]">
    <ComponentErrorBoundary
      :node-id="params.nodeId"
      :node-label="params.label"
      :component-key="params.componentKey"
      :file-name="tpStore.fileName"
      :data-path="params.dataPath"
      :raw-data="currentData"
    >
      <component
        :is="MatchedComponent"
        v-if="MatchedComponent && currentData"
        :data="currentData"
        :data-path="params.dataPath"
      />
      <FallbackJsonView
        v-else
        :missing-key="params.componentKey"
        :raw-data="currentData"
        :data-path="params.dataPath"
      />
    </ComponentErrorBoundary>
  </div>
</template>
