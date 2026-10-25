<script setup lang="ts">
import { computed } from 'vue'
import TpBreadcrumb from '@/components/common/TpBreadcrumb.vue'
import { useTpStore } from '@/store/modules/tp'

const tpStore = useTpStore()

const currentTab = computed(() => tpStore.activeTab)
</script>

<template>
  <TpBreadcrumb
    v-if="currentTab"
    :file-name="tpStore.fileName"
    :active-node-label="currentTab.label"
    :component-key="currentTab.componentKey"
    :data-path="currentTab.dataPath"
  />
  <div
    v-else
    :style="{
      backgroundColor: 'var(--wb-editor-bg, #1e1e1e)',
      borderColor: 'var(--wb-border-color, #2d2d2d)',
    }"
    class="h-26px flex select-none items-center border-b px-3 text-xs text-gray-500 font-mono"
  >
    {{ tpStore.fileName ? `${tpStore.fileName} (无打开标签页)` : '未载入文件' }}
  </div>
</template>
