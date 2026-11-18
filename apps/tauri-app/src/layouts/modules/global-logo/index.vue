<script setup lang="ts">
defineOptions({
  name: 'GlobalLogo',
})

withDefaults(defineProps<Props>(), {
  showTitle: true,
})

interface Props {
  /** Whether to show the title */
  showTitle?: boolean
}
</script>

<template>
  <RouterLink to="/" class="w-full flex-center nowrap-hidden">
    <SystemLogo class="size-32px" />
    <h2 v-show="showTitle" class="pl-8px text-primary font-bold transition duration-300 ease-in-out text-ui-16">
      {{ 'VSCode Desktop' }}
    </h2>
  </RouterLink>
</template>

<style scoped></style>
