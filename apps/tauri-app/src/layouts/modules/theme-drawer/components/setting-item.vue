<script setup lang="ts">
defineOptions({
  name: 'SettingItem',
})

defineProps<Props>()

interface Props {
  /** Label */
  label: string
}
</script>

<template>
  <div role="group" :aria-label="label" class="settings-row w-full flex-y-center flex-wrap justify-between gap-3 text-ui-13">
    <div class="min-w-0 flex-y-center flex-wrap gap-y-1">
      <span class="pr-8px text-base-text">{{ label }}</span>
      <slot name="suffix" />
    </div>
    <slot />
  </div>
</template>

<style scoped></style>
