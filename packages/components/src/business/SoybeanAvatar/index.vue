<script setup lang="ts">
defineOptions({
  name: 'SoybeanAvatar',
})

defineProps<{
  src?: string
}>()
</script>

<template>
  <div class="size-72px overflow-hidden rd-1/2">
    <img v-if="src" :src="src" class="size-full">
    <div v-else class="size-full bg-gray-200" />
  </div>
</template>

<style scoped></style>
