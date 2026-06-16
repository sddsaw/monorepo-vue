<script setup lang="tsx">
import type { OptionItem, SchemaFormOptions } from '../types'
import {
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
  NTimePicker,
} from 'naive-ui'
import { defineAsyncComponent, ref, watchEffect } from 'vue'
import FormDatePicker from './FormDatePicker.vue'
import { OptionsCheckboxGroup, OptionsRadioGroup } from './OptionsGroup'

const props = defineProps<{
  item: SchemaFormOptions
  formModel: Record<string, any>
}>()

const FileUpload = defineAsyncComponent(() => import('../../../business/FileUpload/index.vue'))

const value = defineModel<any>()

// 映射组件关系
const componentMap = {
  'input': NInput,
  'select': NSelect,
  'switch': NSwitch,
  'date-picker': FormDatePicker,
  'checkbox': OptionsCheckboxGroup,
  'radio': OptionsRadioGroup,
  'input-number': NInputNumber,
  'time-picker': NTimePicker,
  'slot': null,
} as const

// 缓存解析后的选项列表
const localOptions = ref<OptionItem[]>([])

// 独立的 watchEffect 用于解析每个项 of options 配置
watchEffect(async () => {
  const optConfig = props.item.options
  if (Array.isArray(optConfig)) {
    localOptions.value = optConfig
  }
  else if (typeof optConfig === 'function') {
    try {
      const res = await optConfig(props.formModel)
      localOptions.value = res
    }
    catch (err) {
      console.error(`Failed to load options for field: ${props.item.value}`, err)
    }
  }
})

/**
 * 合并具体输入组件的透传属性（混入解析后的 options）
 */
function getComponentAttrs(): Record<string, unknown> {
  const baseAttrs = (props.item.attrs || {}) as Record<string, unknown>
  return localOptions.value.length ? { ...baseAttrs, options: localOptions.value } : baseAttrs
}
</script>

<template>
  <FileUpload
    v-if="props.item.type === 'upload'"
    v-model="value"
    class="w-full"
    v-bind="getComponentAttrs()"
  />
  <component
    :is="componentMap[props.item.type as keyof typeof componentMap]"
    v-else-if="componentMap[props.item.type as keyof typeof componentMap]"
    v-model:value="value"
    class="w-full"
    v-bind="getComponentAttrs()"
  />
</template>
