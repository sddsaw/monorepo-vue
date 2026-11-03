<script setup lang="ts">
import { computed } from 'vue'
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary.vue'
import FallbackJsonView from '@/components/common/FallbackJsonView.vue'
import { TP_COMPONENTS } from '@/constants/tpRegistry'
import { useTpStore } from '@/store/modules/tp'
import { useNaiveWorkbenchTheme } from '@/theme/naiveTheme'
import SettingsEditor from './SettingsEditor.vue'

interface PanelPayload {
  nodeId: string
  componentKey: string
  dataPath: (string | number)[]
  label: string
}

const props = defineProps<{
  params: ({ params?: PanelPayload } & Partial<PanelPayload>)
}>()

const tpStore = useTpStore()
const { activeTheme, themeOverrides } = useNaiveWorkbenchTheme()

// 兼容 dockview-vue 传递的 { params: payload, api, containerApi } 嵌套结构
const resolvedParams = computed<PanelPayload>(() => {
  const inner = props.params?.params ?? props.params
  return {
    nodeId: inner?.nodeId || '',
    componentKey: inner?.componentKey || '',
    dataPath: inner?.dataPath || [],
    label: inner?.label || '',
  }
})

const currentData = computed(() => {
  return tpStore.getItemData(resolvedParams.value.dataPath)
})

const MatchedComponent = computed(() => {
  return (TP_COMPONENTS as any)[resolvedParams.value.componentKey]
})
</script>

<template>
  <NConfigProvider :theme="activeTheme" :theme-overrides="themeOverrides" class="size-full">
    <NMessageProvider>
      <div
        :style="{ backgroundColor: 'var(--wb-editor-bg, #1e1e1e)' }"
        class="size-full overflow-auto"
      >
        <ComponentErrorBoundary
          :node-id="resolvedParams.nodeId"
          :node-label="resolvedParams.label"
          :component-key="resolvedParams.componentKey"
          :file-name="tpStore.fileName"
          :data-path="resolvedParams.dataPath"
          :raw-data="currentData"
        >
          <SettingsEditor v-if="resolvedParams.componentKey === 'SettingsView'" />
          <component
            :is="MatchedComponent"
            v-else-if="MatchedComponent && currentData"
            :data="currentData"
            :data-path="resolvedParams.dataPath"
          />
          <FallbackJsonView
            v-else
            :missing-key="resolvedParams.componentKey"
            :raw-data="currentData"
            :data-path="resolvedParams.dataPath"
          />
        </ComponentErrorBoundary>
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>
