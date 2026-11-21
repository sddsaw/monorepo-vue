<script setup lang="ts">
defineOptions({
  name: 'ContinuityEditor',
})

defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <div class="max-w-5xl select-text p-6px text-base-text">
    <ul>
      <li v-for="value in 200" :key="value">
        {{ value }}
      </li>
    </ul>
  </div>
</template>
