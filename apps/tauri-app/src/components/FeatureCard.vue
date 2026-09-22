<script setup lang="ts">
defineProps<{
  title: string
  description: string
  tag?: string
  tagType?: 'success' | 'warning' | 'info' | 'error'
}>()
</script>

<template>
  <div class="flex flex-col border border-[#e2e8f0] rounded-xl bg-white p-5 shadow-sm transition-all duration-200 dark:border-[#27272a] dark:bg-[#18181c] hover:shadow-md">
    <div class="mb-3 flex items-start justify-between">
      <div>
        <div class="flex items-center space-x-2">
          <h3 class="text-sm text-[#0f172a] font-bold dark:text-[#f8fafc]">
            {{ title }}
          </h3>
          <span
            v-if="tag"
            class="border border-blue-500/20 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-500 font-medium"
          >
            {{ tag }}
          </span>
        </div>
        <p class="mt-1 text-xs text-[#64748b] leading-relaxed dark:text-[#94a3b8]">
          {{ description }}
        </p>
      </div>
      <slot name="icon" />
    </div>

    <!-- 交互区域 -->
    <div class="mt-auto border-t border-[#f1f5f9] pt-3 dark:border-[#27272a]/60">
      <slot />
    </div>
  </div>
</template>
