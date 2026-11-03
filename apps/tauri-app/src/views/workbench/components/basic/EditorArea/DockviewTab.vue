<script setup lang="ts">
defineOptions({
  name: 'DockviewTab',
})
</script>

<template>
  <!-- 原生 .tabs-container 已隐藏，实际标签栏由 DockviewGroupTabs (BetterScroll + PageTab) 接管渲染 -->
  <span class="hidden" />
</template>
