<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import {
  NButton,
  NCard,
  NCollapseTransition,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'PmuForceEditor',
})

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const tpStore = useTpStore()
const message = useMessage()
const showRawJson = ref(false)

const item = computed(() => props.data || {})

function updateField(field: string, value: any) {
  if (props.dataPath) {
    tpStore.updateItemField(props.dataPath, field, value)
  }
}

/** 强制施加模式切换 (FVMI 加压测流 / FIMV 加流测压) */
const currentMode = computed({
  get: () => {
    return item.value.forceType === 'Current' ? 'FIMV' : 'FVMI'
  },
  set: (val: 'FVMI' | 'FIMV') => {
    if (val === 'FVMI') {
      updateField('forceType', 'Voltage')
      updateField('measureType', 'Current')
      if (item.value.unit === 'V')
        updateField('unit', 'uA')
    }
    else {
      updateField('forceType', 'Current')
      updateField('measureType', 'Voltage')
      if (item.value.unit === 'uA' || item.value.unit === 'mA')
        updateField('unit', 'V')
    }
  },
})

const rangeOptions = [
  { label: '2 µA (高阻态超微电流)', value: '2uA' },
  { label: '20 µA (微电流范围)', value: '20uA' },
  { label: '200 µA (常规漏电流)', value: '200uA' },
  { label: '2 mA (常规驱动)', value: '2mA' },
  { label: '20 mA (大功率驱动)', value: '20mA' },
  { label: '200 mA (极限负载)', value: '200mA' },
]

async function handleCopyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(item.value, null, 2))
    message.success('底层 JSON 已复制到剪贴板')
  }
  catch {
    message.error('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <div class="business-editor-container max-w-5xl select-text p-6 text-base-text">
    <!-- 头部卡片与标题栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-[var(--theme-radius)] bg-primary/15 text-primary ring-1 ring-primary/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:pulse-line" class="text-ui-20" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base-text font-bold tracking-wide text-ui-16">
              {{ item.name || item.id || 'PMU 精密加压/测流测试' }}
            </h2>
            <NTag type="warning" size="small" round :bordered="false" class="font-mono">
              PMU Parametric
            </NTag>
            <NTag size="small" round :bordered="false" class="bg-primary/15 text-primary font-mono">
              {{ item.channel || 'PMU_CH_01' }}
            </NTag>
          </div>
          <p class="mt-0.5 text-[var(--text-muted)] text-ui-12">
            高精度单管脚直流驱动能力（VOH/VOL）与灌拉漏电流特性测试
          </p>
        </div>
      </div>

      <!-- 右上角操作按钮 -->
      <NSpace align="center" :size="8">
        <NButton
          size="small"
          quaternary
          :type="showRawJson ? 'primary' : 'default'"
          class="transition-all duration-200"
          @click="showRawJson = !showRawJson"
        >
          <template #icon>
            <SvgIcon :icon="showRawJson ? 'ri:code-s-slash-line' : 'ri:code-s-line'" />
          </template>
          {{ showRawJson ? '收起底层 JSON' : '查看底层 JSON' }}
        </NButton>
      </NSpace>
    </div>

    <!-- 模式选择器卡片 -->
    <NCard
      size="small"
      class="editor-card mb-4 border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container transition-all duration-300 hover:border-[var(--border-color)]"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-base-text font-semibold text-ui-13">PMU 工作模式 (Force / Measure Mode):</span>
          <span class="text-[var(--text-muted)] text-ui-11">
            {{ currentMode === 'FVMI' ? '强制输出精准电压，采样反向漏电流' : '强制灌注标称电流，测量管脚端电压' }}
          </span>
        </div>

        <NRadioGroup v-model:value="currentMode" size="small">
          <NRadioButton value="FVMI">
            <span><span class="font-mono">FVMI</span> (加压测流)</span>
          </NRadioButton>
          <NRadioButton value="FIMV">
            <span><span class="font-mono">FIMV</span> (加流测压)</span>
          </NRadioButton>
        </NRadioGroup>
      </div>
    </NCard>

    <!-- 主表单参数卡片 -->
    <NCard
      size="small"
      class="editor-card mb-5 border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container transition-all duration-300 hover:border-[var(--border-color)]"
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-base-text font-semibold text-ui-13">电气激励与上下限判定门限</span>
        <span class="text-[var(--text-muted)] font-mono text-ui-11">Channel: {{ item.channel || 'Auto' }}</span>
      </div>

      <NGrid cols="1 500:2 800:3" responsive="self" :x-gap="16" :y-gap="14">
        <!-- 测试项名称 -->
        <NGi>
          <label class="mb-1 block text-[var(--text-muted)] font-medium text-ui-11">测试项名称 (Test Name)</label>
          <NInput
            size="small"
            :value="item.name || ''"
            placeholder="输入测试项名称"
            clearable
            @update:value="updateField('name', $event)"
          />
        </NGi>

        <!-- 施加激励值 -->
        <NGi>
          <label class="mb-1 block text-[var(--text-muted)] font-medium text-ui-11">
            {{ currentMode === 'FVMI' ? '强制施加电压 (Force Voltage)' : '强制施加电流 (Force Current)' }}
          </label>
          <NInputNumber
            size="small"
            :value="item.forceValue ?? 3.3"
            :step="currentMode === 'FVMI' ? 0.05 : 0.5"
            class="w-full"
            @update:value="updateField('forceValue', $event)"
          >
            <template #suffix>
              <span class="text-[var(--text-muted)] font-mono text-ui-10">{{ currentMode === 'FVMI' ? 'V' : (item.unit || 'mA') }}</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 量程选择 -->
        <NGi>
          <label class="mb-1 block text-[var(--text-muted)] font-medium text-ui-11">测量量程 (Measurement Range)</label>
          <NSelect
            size="small"
            :value="item.currentRange || '20mA'"
            :options="rangeOptions"
            @update:value="updateField('currentRange', $event)"
          />
        </NGi>

        <!-- 门限下限 -->
        <NGi>
          <label class="mb-1 block text-[var(--text-muted)] font-medium text-ui-11">判定下限 (Low Limit)</label>
          <NInputNumber
            size="small"
            :value="item.loLimit ?? -0.5"
            :step="0.05"
            class="w-full"
            @update:value="updateField('loLimit', $event)"
          >
            <template #suffix>
              <span class="text-[var(--text-muted)] font-mono text-ui-10">{{ item.unit || 'V' }}</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 门限上限 -->
        <NGi>
          <label class="mb-1 block text-[var(--text-muted)] font-medium text-ui-11">判定上限 (High Limit)</label>
          <NInputNumber
            size="small"
            :value="item.hiLimit ?? 0.5"
            :step="0.05"
            class="w-full"
            @update:value="updateField('hiLimit', $event)"
          >
            <template #suffix>
              <span class="text-[var(--text-muted)] font-mono text-ui-10">{{ item.unit || 'V' }}</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 钳位电压 -->
        <NGi>
          <label class="mb-1 block text-[var(--text-muted)] font-medium text-ui-11">安全钳位保护 (Voltage Clamp)</label>
          <NInputNumber
            size="small"
            :value="item.voltageClamp ?? 3.6"
            :step="0.1"
            :min="0"
            class="w-full"
            @update:value="updateField('voltageClamp', $event)"
          >
            <template #suffix>
              <span class="text-[var(--text-muted)] font-mono text-ui-10">V</span>
            </template>
          </NInputNumber>
        </NGi>
      </NGrid>
    </NCard>

    <!-- 底层 JSON 展开抽屉（带有平滑折叠展开动画） -->
    <NCollapseTransition :show="showRawJson">
      <div class="mt-4 border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-layout p-4 shadow-xl transition-all duration-300">
        <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
            <span class="text-base-text font-medium text-ui-12">底层原始数据结构 (Live Sync)</span>
          </div>
          <NButton size="tiny" secondary type="primary" @click="handleCopyJson">
            <template #icon>
              <SvgIcon icon="ri:file-copy-line" />
            </template>
            复制代码
          </NButton>
        </div>
        <pre class="max-h-64 select-all overflow-auto rounded-[var(--theme-radius)] bg-[var(--hover-color)] p-3.5 text-success/90 leading-relaxed font-mono text-ui-11">{{ JSON.stringify(item, null, 2) }}</pre>
      </div>
    </NCollapseTransition>
  </div>
</template>

<style scoped>
.editor-card {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.editor-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
</style>
