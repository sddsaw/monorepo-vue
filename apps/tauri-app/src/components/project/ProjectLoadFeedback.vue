<script setup lang="ts">
import { useProjectNavigation } from '@/hooks/business/project'
import { useTpStore } from '@/store/modules/tp'
import ProjectLoadDialog from './ProjectLoadDialog.vue'

const tpStore = useTpStore()
const { retryOpenProject } = useProjectNavigation()
</script>

<template>
  <ProjectLoadDialog :state="tpStore.projectLoad" @cancel="tpStore.cancelProjectLoad" @retry="retryOpenProject" />
</template>
