<script setup lang="ts">
import type { BusinessColumn } from '@/core/table-columns'
import { NDropdown, NInput } from 'naive-ui'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{ column: BusinessColumn, allowAdd: boolean, editing: boolean, selected: boolean, canRename: boolean }>()
const emit = defineEmits<{ insert: [side: 'left' | 'right'], rename: [title: string], finish: [], select: [] }>()
const showMenu = ref(false)
const x = ref(0)
const y = ref(0)
const draft = ref('')
const input = useTemplateRef('input')
const button = useTemplateRef('button')
const localEditing = ref(false)
let finishing = false
const isEditing = computed(() => props.editing || localEditing.value)
const menu = computed(() => [
  { label: '左侧插入列', key: 'left' },
  { label: '右侧插入列', key: 'right' },
  ...(props.canRename ? [{ label: '重命名列', key: 'rename' }] : []),
])
watch(isEditing, async (editing) => {
  if (!editing)
    return
  finishing = false
  draft.value = props.column.title
  await nextTick()
  input.value?.focus()
  input.value?.select()
}, { immediate: true })
function openMenu(event: MouseEvent) {
  if (!props.allowAdd)
    return
  event.preventDefault()
  emit('select')
  x.value = event.clientX
  y.value = event.clientY
  showMenu.value = true
}
function keyboardMenu(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))
    return
  if (!props.allowAdd)
    return
  event.preventDefault()
  const rect = button.value!.getBoundingClientRect()
  x.value = rect.left
  y.value = rect.bottom
  showMenu.value = true
}
function choose(key: string) {
  showMenu.value = false
  if (key === 'rename')
    localEditing.value = true
  else emit('insert', key as 'left' | 'right')
}
function finish(save: boolean, restoreFocus = false) {
  if (finishing)
    return
  finishing = true
  if (save && draft.value.trim())
    emit('rename', draft.value.trim())
  localEditing.value = false
  emit('finish')
  if (restoreFocus)
    nextTick(() => button.value?.focus())
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing)
    return
  if (event.key === 'Enter' || event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    finish(event.key === 'Enter', true)
  }
}
</script>

<template>
  <NInput
    v-if="isEditing"
    ref="input"
    v-model:value="draft"
    size="small"
    :input-props="{ 'aria-label': '列名称' }"
    @keydown="keydown"
    @blur="finish(true)"
  />
  <button
    v-else
    ref="button"
    type="button"
    class="column-header w-full text-left"
    :class="{ 'text-primary': selected }"
    :aria-label="`选中列 ${column.title}`"
    :aria-pressed="selected"
    :title="allowAdd ? `${column.title} · 右键插入列` : column.title"
    @click="emit('select')"
    @contextmenu="openMenu"
    @keydown="keyboardMenu"
  >
    {{ column.title }}
  </button>
  <NDropdown
    :show="showMenu"
    trigger="manual"
    :x="x"
    :y="y"
    :options="menu"
    :on-clickoutside="() => { showMenu = false }"
    @select="choose"
  />
</template>

<style scoped>
.column-header:focus-visible { outline: 2px solid rgb(var(--primary-color)); outline-offset: 2px; }
</style>
