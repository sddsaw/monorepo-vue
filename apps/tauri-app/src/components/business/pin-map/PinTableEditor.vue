<script setup lang="ts">
defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <div class="p-4 text-white">
    <h3 class="text-lg font-bold mb-2">芯片管脚映射表 (PinMap)</h3>
    <pre class="bg-black/40 p-3 rounded text-xs font-mono text-gray-300">{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>
