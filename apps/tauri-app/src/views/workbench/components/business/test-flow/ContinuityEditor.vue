<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import {
  NButton,
  NCard,
  NCollapseTransition,
  NDivider,
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
  name: 'ContinuityEditor',
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
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-8px bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:flashlight-line" class="text-20px" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-16px text-white font-bold tracking-wide">
              {{ item.name || item.testName || '开短路测试 (Continuity)' }}
            </h2>
            <NTag type="info" size="small" round :bordered="false" class="font-mono">
              Continuity / Contact
            </NTag>
          </div>
          <p class="mt-0.5 text-12px text-gray-400">
            静电保护二极管导通压降与管脚连通性验证
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
        <span class="text-13px text-gray-300 font-semibold">电气测试参数配置</span>
        <span class="text-11px text-gray-500 font-mono">Realtime Store Binding</span>
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
            class="transition-colors duration-200"
            @update:value="updateField('name', $event)"
          />
        </NGi>

        <!-- 强制灌流 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">强制灌流 (Force Current)</label>
          <NInputNumber
            size="small"
            :value="item.forceCurrent ?? -1.0"
            :step="0.1"
            class="w-full"
            @update:value="updateField('forceCurrent', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">mA</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 钳位电压 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">电压钳位 (Clamp Voltage)</label>
          <NInputNumber
            size="small"
            :value="item.voltageClamp ?? item.clampVoltage ?? 2.0"
            :step="0.1"
            :min="0"
            class="w-full"
            @update:value="updateField('voltageClamp', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">V</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 门限下限 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">低限阈值 (Low Limit)</label>
          <NInputNumber
            size="small"
            :value="item.loLimit ?? item.lowLimit ?? -1.2"
            :step="0.05"
            class="w-full"
            @update:value="updateField('loLimit', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">V</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 门限上限 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">高限阈值 (High Limit)</label>
          <NInputNumber
            size="small"
            :value="item.hiLimit ?? item.highLimit ?? -0.2"
            :step="0.05"
            class="w-full"
            @update:value="updateField('hiLimit', $event)"
          >
            <template #suffix>
              <span class="text-gray-500 font-mono text-10px">V</span>
            </template>
          </NInputNumber>
        </NGi>

        <!-- 采样等待时间 -->
        <NGi>
          <label class="mb-1 block text-11px text-gray-400 font-medium">稳定延时 (Settling Time)</label>
          <NInputNumber
            size="small"
            :value="item.settlingTimeMs ?? item.waitTime ?? 2.5"
            :step="0.5"
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

    <!-- 关联管脚卡片 -->
    <NCard
      size="small"
      class="editor-card mb-5 border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-[#3e3e42]"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-13px text-gray-300 font-semibold">目标管脚群组 (Target Pins)</span>
          <NTag size="tiny" type="info" round :bordered="false">
            {{ Array.isArray(item.pins) ? item.pins.length : (item.pinGroup || 'ALL_IO_PINS') }}
          </NTag>
        </div>
        <span class="text-11px text-gray-500">自动分配机台测试通道</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <template v-if="Array.isArray(item.pins) && item.pins.length > 0">
          <NTooltip v-for="pin in item.pins" :key="pin" trigger="hover">
            <template #trigger>
              <NTag
                size="small"
                round
                class="cursor-pointer font-mono transition-transform duration-150 hover:scale-105"
                type="info"
              >
                {{ pin }}
              </NTag>
            </template>
            点击查看该管脚映射配置
          </NTooltip>
        </template>
        <template v-else>
          <NTag
            v-for="pin in ['PIN_IO0', 'PIN_IO1', 'PIN_CLK', 'PIN_RST', 'PIN_TX', 'PIN_RX', 'PIN_CS', 'PIN_MISO']"
            :key="pin"
            size="small"
            round
            class="font-mono opacity-90 transition-transform duration-150 hover:scale-105"
            type="info"
          >
            {{ pin }}
          </NTag>
        </template>
      </div>
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
