<script setup lang="ts">
defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <div class="p-4 text-white">
    <h3 class="mb-2 text-lg font-bold">
      测试套件总览
    </h3>
    <pre class="rounded bg-black/40 p-3 text-xs text-gray-300 font-mono">{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>
