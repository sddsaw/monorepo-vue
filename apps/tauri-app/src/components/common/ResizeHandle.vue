<script setup lang="ts">
import { useDraggable } from '@vueuse/core'
import { onUnmounted, ref, watch } from 'vue'

interface Props {
  /** 绑定的尺寸数值 (支持 v-model) */
  modelValue?: number
  /** 方向: 'col' 为垂直分割线(水平拉伸宽度), 'row' 为水平分割线(垂直拉伸高度) */
  direction?: 'col' | 'row'
  /** 最小尺寸 */
  min?: number
  /** 最大尺寸 */
  max?: number
  /** 是否反向计算变化量 (例如右侧侧边栏向左拖拽变大，或底部面板向上拖拽变高) */
  reverse?: boolean
  /** 提示文案 */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 240,
  direction: 'col',
  min: 160,
  max: 600,
  reverse: false,
  title: '拖拽调节尺寸',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'start'): void
  (e: 'resize', value: number): void
  (e: 'end'): void
}>()

const handleRef = ref<HTMLElement | null>(null)

let startCoord = 0
let startSize = 0

const { isDragging } = useDraggable(handleRef, {
  preventDefault: true,
  onStart: (_, e: PointerEvent) => {
    emit('start')
    startCoord = props.direction === 'col' ? e.clientX : e.clientY
    startSize = props.modelValue
  },
  onMove: (_, e: PointerEvent) => {
    const currentCoord = props.direction === 'col' ? e.clientX : e.clientY
    const rawDelta = currentCoord - startCoord
    const delta = props.reverse ? -rawDelta : rawDelta
    const targetSize = startSize + delta

    const newSize = Math.max(props.min, Math.min(props.max, targetSize))
    emit('update:modelValue', newSize)
    emit('resize', newSize)
  },
  onEnd: () => {
    emit('end')
  },
})

watch(isDragging, (dragging) => {
  if (dragging) {
    document.body.style.cursor = props.direction === 'col' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }
  else {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
})

onUnmounted(() => {
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})
</script>

<template>
  <div
    ref="handleRef"
    class="group relative flex shrink-0 select-none items-center justify-center"
    :style="{
      backgroundColor: 'rgb(var(--layout-bg-color))',
    }"
    :class="[
      direction === 'col' ? 'h-full w-4px cursor-col-resize' : 'w-full h-4px cursor-row-resize',
    ]"
    :title="title"
  >
    <!-- 拖拽感应/高亮指示中线 -->
    <div
      class="transition-colors duration-150"
      :class="[
        direction === 'col' ? 'h-full w-1px' : 'w-full h-1px',
        isDragging ? 'bg-primary' : 'group-hover:bg-primary/50',
      ]"
    />

    <!-- 居中的三点拉伸指示图标 -->
    <div
      class="absolute left-1/2 top-1/2 flex items-center rounded-full p-1px transition-colors duration-150 -translate-x-1/2 -translate-y-1/2"
      :class="[
        direction === 'col' ? 'flex-col gap-3px' : 'flex-row gap-3px',
        isDragging ? 'bg-primary/20' : 'group-hover:bg-[var(--hover-color)]',
      ]"
    >
      <span
        class="h-2px w-2px rounded-full bg-[var(--text-muted)] transition-colors"
        :class="[isDragging ? 'bg-primary' : 'group-hover:bg-gray-300']"
      />
      <span
        class="h-2px w-2px rounded-full bg-[var(--text-muted)] transition-colors"
        :class="[isDragging ? 'bg-primary' : 'group-hover:bg-gray-300']"
      />
      <span
        class="h-2px w-2px rounded-full bg-[var(--text-muted)] transition-colors"
        :class="[isDragging ? 'bg-primary' : 'group-hover:bg-gray-300']"
      />
    </div>
  </div>
</template>
