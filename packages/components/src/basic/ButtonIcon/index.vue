<script setup lang="ts">
import type { ButtonProps, PopoverPlacement } from 'naive-ui'
import { twMerge } from 'tailwind-merge'
import SvgIcon from '../SvgIcon/index.vue'

defineOptions({
  name: 'ButtonIcon',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<Props>(), {
  class: '',
  icon: '',
  size: 'tiny',
  tooltipContent: '',
  tooltipPlacement: 'bottom',
  zIndex: 98,
})

interface Props {
  /** Button class */
  class?: any
  /** Iconify icon name */
  icon?: string
  /** Button size */
  size?: ButtonProps['size']
  /** Tooltip content */
  tooltipContent?: string
  /** Tooltip placement */
  tooltipPlacement?: PopoverPlacement
  zIndex?: number
}

const DEFAULT_CLASS = 'h-22px w-22px !p-0 text-13px text-icon'
</script>

<template>
  <NTooltip :placement="tooltipPlacement" :z-index="zIndex" :disabled="!tooltipContent">
    <template #trigger>
      <NButton quaternary :size="size" :class="twMerge(DEFAULT_CLASS, props.class)" v-bind="$attrs">
        <div class="flex-center">
          <slot>
            <SvgIcon :icon="icon" />
          </slot>
        </div>
      </NButton>
    </template>
    {{ tooltipContent }}
  </NTooltip>
</template>

<style scoped></style>
