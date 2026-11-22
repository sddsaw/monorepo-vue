<script setup lang="ts">
import type { PinDraft } from './pin-table.types'
import { NButton, NForm, NFormItem, NInput, NModal, NSelect } from 'naive-ui'
import { reactive, ref, watch } from 'vue'

const emit = defineEmits<{ submit: [draft: PinDraft, kind: 'individualPins' | 'pinGroups'] }>()
const show = defineModel<boolean>('show', { required: true })
const draft = reactive<PinDraft>({ groupName: '', pinName: '', type: 'Input', comment: '' })
const kind = ref<'individualPins' | 'pinGroups'>('individualPins')
const error = ref('')
watch(show, (value) => {
  if (value) {
    Object.assign(draft, { groupName: '', pinName: '', type: 'Input', comment: '' })
    kind.value = 'individualPins'
    error.value = ''
  }
})
function submit() {
  if (!draft.pinName.trim() || (kind.value === 'pinGroups' && !draft.groupName.trim())) {
    error.value = '请填写 Pin Name；分组管脚还需要 Group Name'
    return
  }
  emit('submit', { ...draft, pinName: draft.pinName.trim() }, kind.value)
}
</script>

<template>
  <NModal v-model:show="show" preset="card" title="新增管脚" class="max-w-480px" :style="{ width: 'calc(100vw - 32px)' }">
    <NForm label-placement="top" @submit.prevent="submit">
      <NFormItem label="管脚类别">
        <NSelect v-model:value="kind" :options="[{ label: '独立管脚', value: 'individualPins' }, { label: '分组管脚', value: 'pinGroups' }]" aria-label="管脚类别" />
      </NFormItem>
      <NFormItem label="Group Name">
        <NInput v-model:value="draft.groupName" :input-props="{ 'aria-label': '新增 Group Name' }" />
      </NFormItem>
      <NFormItem label="Pin Name" required>
        <NInput v-model:value="draft.pinName" :input-props="{ 'aria-label': '新增 Pin Name' }" />
      </NFormItem>
      <NFormItem label="Type">
        <NSelect v-model:value="draft.type" :options="['Input', 'Output', 'I/O', 'Power', 'Ground', 'Analog', 'Digital', 'BIDIR', 'RF'].map(value => ({ label: value, value }))" aria-label="新增 Type" />
      </NFormItem>
      <NFormItem label="Comment">
        <NInput v-model:value="draft.comment" :input-props="{ 'aria-label': '新增 Comment' }" />
      </NFormItem>
      <p v-if="error" role="alert" class="mb-12px text-error">
        {{ error }}
      </p>
      <div class="flex justify-end gap-8px">
        <NButton @click="show = false">
          取消
        </NButton><NButton type="primary" attr-type="submit">
          添加
        </NButton>
      </div>
    </NForm>
  </NModal>
</template>
