<script setup lang="ts">
defineProps<{
  missingKey?: string
  rawData?: any
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <div class="p-6 text-gray-300">
    <div class="bg-amber-950/30 border border-amber-500/50 p-4 rounded-lg mb-4">
      <div class="flex items-center gap-2 text-amber-400 font-semibold mb-1">
        <span>ℹ️</span>
        <h4>未找到对应专属业务组件: [{{ missingKey || '未定义' }}]</h4>
      </div>
      <p class="text-xs text-amber-200/80">
        已自动切入原始 JSON 树形预览模式。可在系统插件中心或 src/constants/tpRegistry.ts 中注册该组件。
      </p>
    </div>

    <div class="bg-[#181818] border border-[#2d2d2d] rounded-lg p-4 font-mono text-xs">
      <div class="text-gray-400 mb-2 font-semibold">节点数据路径: $.{{ dataPath ? dataPath.join('.') : 'root' }}</div>
      <pre class="overflow-auto max-h-96 text-green-300 bg-black/50 p-3 rounded">{{ JSON.stringify(rawData, null, 2) }}</pre>
    </div>
  </div>
</template>
