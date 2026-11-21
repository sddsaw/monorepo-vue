<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="space-y-12px" :aria-label="title">
    <h3 class="m-0 text-base-text font-600 text-ui-14">
      {{ title }}
    </h3>
    <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-16px space-y-16px">
      <slot />
    </div>
  </section>
</template>
