<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import type { ColumnValue, ColumnValueType } from '@/core/table-columns'
import { NInput, NSelect } from 'naive-ui'
import { nextTick, ref, useTemplateRef } from 'vue'

const props = defineProps<{ value: ColumnValue, valueType?: ColumnValueType, label: string, disabled?: boolean, required?: boolean, options?: SelectOption[] }>()
const emit = defineEmits<{ update: [value: ColumnValue], activate: [] }>()
const editing = ref(false)
const draft = ref('')
const error = ref('')
const input = useTemplateRef('input')
const button = useTemplateRef('button')

async function start() {
  emit('activate')
  draft.value = String(props.value)
  error.value = ''
  editing.value = true
  await nextTick()
  input.value?.focus()
}

function commit(restoreFocus = false) {
  if (!editing.value)
    return
  if (props.required && !draft.value.trim()) {
    error.value = 'Pin Name 不能为空'
    return
  }
  let value: ColumnValue = draft.value
  if (props.valueType === 'number') {
    if (!draft.value.trim() || !Number.isFinite(Number(draft.value))) {
      error.value = '请输入有效数字'
      return
    }
    value = Number(draft.value)
  }
  else if (props.valueType === 'boolean') {
    value = draft.value === 'true'
  }
  editing.value = false
  if (value !== props.value)
    emit('update', value)
  if (restoreFocus)
    nextTick(() => button.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    editing.value = false
    nextTick(() => button.value?.focus())
  }
  else if (event.key === 'Enter' && !event.isComposing && !props.options) {
    event.preventDefault()
    commit(true)
  }
}
</script>

<template>
  <div v-if="editing" class="p-4px" @keydown="onKeydown" @click.stop>
    <NSelect
      v-if="options"
      ref="input"
      :value="draft"
      :options="options"
      :aria-label="label"
      show-on-focus
      size="small"
      @update:value="(value: string) => { draft = value; commit(true) }"
      @update:show="(show: boolean) => { if (!show) nextTick(() => commit()) }"
    />
    <NInput
      v-else
      ref="input"
      v-model:value="draft"
      :input-props="{ 'aria-label': label }"
      :status="error ? 'error' : undefined"
      size="small"
      @blur="commit()"
    />
    <span v-if="error" role="alert" class="text-error text-ui-12">{{ error }}</span>
  </div>
  <button
    v-else
    ref="button"
    type="button"
    :disabled="disabled"
    :aria-label="`编辑 ${label}`"
    :title="String(value)"
    class="pin-cell w-full px-8px py-4px text-left text-ui-13 min-h-ui-28"
    @click="start"
  >
    {{ value === '' ? '\u00a0' : String(value) }}
  </button>
</template>

<style scoped>
.pin-cell { color: inherit; overflow-wrap: anywhere; }
.pin-cell:focus-visible { outline: 2px solid rgb(var(--primary-color)); outline-offset: -2px; }
.pin-cell:disabled { cursor: default; }
</style>
