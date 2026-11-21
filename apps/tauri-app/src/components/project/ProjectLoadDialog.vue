<script setup lang="ts">
import type { ProjectLoadState } from '@/core/project-loader'
import { NAlert, NButton, NModal, NProgress } from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{ state: ProjectLoadState }>()
defineEmits<{ cancel: [], retry: [] }>()
const beforeLoad = computed(() => props.state.status === 'checking' || (props.state.status === 'error' && props.state.progress === 0))
const title = computed(() => beforeLoad.value ? '工程文件检查' : 'Load · 加载测试程序')
</script>

<template>
  <NModal
    :show="state.status !== 'idle'"
    preset="card"
    :title="title"
    :closable="false"
    :mask-closable="false"
    :close-on-esc="false"
    :style="{ width: '560px', maxWidth: 'calc(100vw - 32px)' }"
    :aria-label="title"
  >
    <div class="flex flex-col gap-24px">
      <div class="min-w-0">
        <p class="mb-8px break-all font-600 text-ui-20">
          {{ state.name || '测试程序' }}
        </p>
        <p class="break-all text-[var(--text-muted)] font-mono text-ui-12">
          {{ state.path }}
        </p>
      </div>
      <NAlert v-if="state.status === 'error'" type="error" :title="state.stage" role="alert">
        <p class="whitespace-pre-wrap break-all">
          {{ state.error }}
        </p>
      </NAlert>
      <template v-else>
        <p role="status" aria-live="polite" class="text-ui-14">
          {{ state.stage }}
        </p>
        <div v-if="!beforeLoad" role="progressbar" aria-label="程序加载进度" :aria-valuenow="state.progress" :aria-valuemin="0" :aria-valuemax="100">
          <NProgress type="line" :percentage="state.progress" :status="state.status === 'success' ? 'success' : 'default'" />
        </div>
      </template>
      <p class="text-[var(--text-muted)] text-ui-12">
        {{ beforeLoad ? '相关文件全部通过检查后才会开始 Load；检查未通过时保留当前工程。' : '模拟 Load：完成后进入测试工作台，未连接或执行真实机台测试。' }}
      </p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-8px">
        <NButton :disabled="state.status === 'success'" @click="$emit('cancel')">
          {{ state.status === 'error' ? '返回' : beforeLoad ? '取消检查' : '取消加载' }}
        </NButton>
        <NButton v-if="state.status === 'error'" type="primary" @click="$emit('retry')">
          重新选择文件
        </NButton>
      </div>
    </template>
  </NModal>
</template>
