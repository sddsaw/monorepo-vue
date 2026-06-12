<script setup lang="ts">
import { NButton } from 'naive-ui'

defineProps<{
  label?: string
}>()
</script>

<template>
  <NButton type="primary">
    {{ label || 'Custom SaButton' }}
  </NButton>
</template>

<style scoped></style>
