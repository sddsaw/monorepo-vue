<script setup lang="ts">
import { NDatePicker } from 'naive-ui'
import { computed } from 'vue'

defineOptions({
  name: 'FormDatePicker',
  inheritAttrs: false,
})

const props = defineProps<{
  value: DatePickerValue
  valueFormat?: string
}>()

const emit = defineEmits<{
  (e: 'update:value', val: DatePickerValue): void
}>()

type DatePickerValue = string | number | [string, string] | [number, number] | null

const isFormatMode = computed(() => !!props.valueFormat)

// 转换对应格式的值，避免类型冲突
const formattedValue = computed(() => {
  return isFormatMode.value ? (props.value as string | [string, string] | null) : null
})

const timestampValue = computed(() => {
  return isFormatMode.value ? null : (props.value as number | [number, number] | null)
})
</script>

<template>
  <NDatePicker
    v-if="isFormatMode"
    :formatted-value="formattedValue"
    v-bind="$attrs"
    @update:formatted-value="(val) => emit('update:value', val)"
  />
  <NDatePicker
    v-else
    :value="timestampValue"
    v-bind="$attrs"
    @update:value="(val) => emit('update:value', val)"
  />
</template>
