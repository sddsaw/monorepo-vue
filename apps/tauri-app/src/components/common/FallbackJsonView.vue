<script setup lang="ts">
defineProps<{
  missingKey?: string
  rawData?: any
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <div class="p-6 text-base-text">
    <div class="mb-4 border border-warning/50 rounded-lg bg-warning/30 p-4">
      <div class="mb-1 flex items-center gap-2 text-warning font-semibold">
        <span>ℹ️</span>
        <h4>未找到对应专属业务组件: [{{ missingKey || '未定义' }}]</h4>
      </div>
      <p class="text-xs text-warning/80">
        已自动切入原始 JSON 树形预览模式。可在系统插件中心或 src/constants/tpRegistry.ts 中注册该组件。
      </p>
    </div>

    <div class="border border-[var(--border-color)] rounded-lg bg-layout p-4 text-xs">
      <div class="mb-2 text-[var(--text-muted)] font-semibold">
        节点数据路径: <span class="font-mono">$.{{ dataPath ? dataPath.join('.') : 'root' }}</span>
      </div>
      <pre class="max-h-96 overflow-auto rounded bg-[var(--hover-color)] p-3 text-success font-mono">{{ JSON.stringify(rawData, null, 2) }}</pre>
    </div>
  </div>
</template>
