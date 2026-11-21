<script setup lang="ts">
defineProps<{ data?: unknown, dataPath?: (string | number)[] }>()
</script>

<template>
  <section class="select-text p-24px text-base-text">
    <h2 class="mb-16px break-all font-600 text-ui-16">
      {{ dataPath?.join(' / ') || '工程配置' }}
    </h2>
    <pre class="overflow-auto border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-layout p-16px font-mono text-ui-14">{{ JSON.stringify(data, null, 2) }}</pre>
  </section>
</template>
