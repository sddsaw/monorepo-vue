<script setup lang="ts">
import { SvgIcon } from '@sa/components'

defineProps<{
  title: string
  description: string
  tag?: string
  icon?: string
}>()
</script>

<template>
  <div class="group relative flex flex-col justify-between overflow-hidden border border-black/[0.06] rounded-xl bg-white/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-300 dark:border-white/[0.08] dark:bg-[#18181c]/80 hover:shadow-black/[0.04] hover:shadow-lg hover:-translate-y-0.5 dark:hover:border-primary/30">
    <!-- 卡片头部信息 -->
    <div>
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div v-if="icon || $slots.icon" class="h-7 w-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 dark:bg-primary/15 dark:text-primary">
            <slot name="icon">
              <SvgIcon v-if="icon" :icon="icon" class="text-base" />
            </slot>
          </div>
          <h3 class="text-[13px] text-slate-800 font-bold tracking-tight dark:text-zinc-100">
            {{ title }}
          </h3>
        </div>

        <span
          v-if="tag"
          class="border border-primary/15 rounded bg-primary/8 px-2 py-1 text-[10px] text-primary font-semibold dark:border-primary/20 dark:bg-primary/15 dark:text-primary"
        >
          {{ tag }}
        </span>
      </div>

      <p class="text-xs text-slate-500 leading-relaxed dark:text-zinc-400">
        {{ description }}
      </p>
    </div>

    <!-- 卡片交互操作区 -->
    <div class="mt-3 border border-black/[0.04] rounded-lg bg-slate-50/60 p-3 transition-colors dark:border-white/[0.04] dark:bg-zinc-900/40">
      <slot />
    </div>
  </div>
</template>
