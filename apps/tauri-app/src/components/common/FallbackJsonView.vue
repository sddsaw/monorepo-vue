<script setup lang="ts">
defineProps<{
  missingKey?: string
  rawData?: any
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <div class="p-6 text-gray-300">
    <div class="mb-4 border border-amber-500/50 rounded-lg bg-amber-950/30 p-4">
      <div class="mb-1 flex items-center gap-2 text-amber-400 font-semibold">
        <span>ℹ️</span>
        <h4>未找到对应专属业务组件: [{{ missingKey || '未定义' }}]</h4>
      </div>
      <p class="text-xs text-amber-200/80">
        已自动切入原始 JSON 树形预览模式。可在系统插件中心或 src/constants/tpRegistry.ts 中注册该组件。
      </p>
    </div>

    <div class="border border-[#2d2d2d] rounded-lg bg-[#181818] p-4 text-xs font-mono">
      <div class="mb-2 text-gray-400 font-semibold">
        节点数据路径: $.{{ dataPath ? dataPath.join('.') : 'root' }}
      </div>
      <pre class="max-h-96 overflow-auto rounded bg-black/50 p-3 text-green-300">{{ JSON.stringify(rawData, null, 2) }}</pre>
    </div>
  </div>
</template>
