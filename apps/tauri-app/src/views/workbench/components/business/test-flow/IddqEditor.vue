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
  NSpace,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'IddqEditor',
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
  <div class="business-editor-container max-w-5xl select-text p-6 text-gray-200">
    <!-- 头部卡片与标题栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-8px bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:battery-charge-line" class="text-20px" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-16px text-white font-bold tracking-wide">
              {{ item.name || item.testName || '静态功耗电流测试 (IDDQ)' }}
            </h2>
            <NTag type="success" size="small" round :bordered="false" class="font-mono">
              IDDQ / Quiescent
            </NTag>
          </div>
          <p class="mt-0.5 text-12px text-gray-400">
            高压待机与芯片深度休眠状态静态漏电流精密测量
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

    <!-- 主表单参数卡片 -->
    <NCard
      size="small"
      class="editor-card mb-5 border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-[#3e3e42]"
    >
      <div class="mb-3 flex items-center justify-between">
        <span class="text-13px text-gray-300 font-semibold">供电电源与静态电流门限</span>
        <span class="text-11px text-gray-500 font-mono">Micro-Ampere Range</span>
      </div>

      <NGrid cols="1 s:2 m:2 l:3" responsive="screen" :x-gap="16" :y-gap="14">
        <!-- 测试项名称 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">测试项名称 (Test Name)</label>
          <NInput
            size="small"
            :value="item.name || item.testName || ''"
            placeholder="输入测试项名称"
            clearable
            @update:value="updateField('name', $event)"
          />
        </NGi>

        <!-- 供电电压 VDD -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">供电电压 (VDD Voltage)</label>
          <NInputNumber
            size="small"
            :value="item.vccVolt ?? item.vddVoltage ?? 3.3"
            :step="0.05"
            :min="0"
            class="w-full"
            @update:value="updateField(item.vccVolt !== undefined ? 'vccVolt' : 'vddVoltage', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">V</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 静态电流上限 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">电流上限 (High Limit / Max Current)</label>
          <NInputNumber
            size="small"
            :value="item.maxCurrentUa ?? item.hiLimit ?? item.highLimit ?? 50"
            :step="1"
            class="w-full"
            @update:value="updateField(item.maxCurrentUa !== undefined ? 'maxCurrentUa' : 'hiLimit', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">µA</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 静态电流下限 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">电流下限 (Low Limit)</label>
          <NInputNumber
            size="small"
            :value="item.loLimit ?? item.lowLimit ?? 0.0"
            :step="0.1"
            class="w-full"
            @update:value="updateField('loLimit', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">µA</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 测量积分周期 NPLC -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">积分周期 (Integration NPLC)</label>
          <NInputNumber
            size="small"
            :value="item.nplc ?? 1"
            :step="1"
            :min="0.1"
            class="w-full"
            @update:value="updateField('nplc', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">PLC</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 稳定等待时间 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">上电稳定延时 (Settling Time)</label>
          <NInputNumber
            size="small"
            :value="item.settlingTimeMs ?? 5"
            :step="1"
            :min="0"
            class="w-full"
            @update:value="updateField('settlingTimeMs', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">ms</span>
            </template>
          </NInputNumber>
        </NGi>
      </NGrid>
    </NCard>

    <!-- 底层 JSON 展开抽屉（带有平滑折叠展开动画） -->
    <NCollapseTransition :show="showRawJson">
      <div class="mt-4 border border-[#333333] rounded-8px bg-[#181818] p-4 shadow-xl transition-all duration-300">
        <div class="mb-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span class="text-12px text-gray-300 font-mono font-medium">底层原始数据结构 (Live Sync)</span>
          </div>
          <NButton size="tiny" secondary type="primary" @click="handleCopyJson">
            <template #icon>
              <SvgIcon icon="ri:file-copy-line" />
            </template>
            复制代码
          </NButton>
        </div>
        <pre class="max-h-64 overflow-auto rounded-6px bg-black/60 p-3.5 text-11px text-emerald-400/90 font-mono leading-relaxed select-all">{{ JSON.stringify(item, null, 2) }}</pre>
      </div>
    </NCollapseTransition>
  </div>
</template>

<style scoped>
.business-editor-container {
  animation: fadeInSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInSlideUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.editor-card {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.editor-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
</style>
