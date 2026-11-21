<script setup lang="ts">
defineProps<{ src: string, title: string }>()
</script>

<template>
  <!-- Dockview temporarily disables iframe pointer events while dragging/resizing. -->
  <iframe
    class="workbench-iframe"
    :src="src"
    :title="title"
    sandbox="allow-scripts"
    referrerpolicy="no-referrer"
  />
</template>

<style scoped>
.workbench-iframe {
  display: block;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
}
</style>
