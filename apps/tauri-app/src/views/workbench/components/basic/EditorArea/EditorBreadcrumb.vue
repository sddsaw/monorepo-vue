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
</template>
