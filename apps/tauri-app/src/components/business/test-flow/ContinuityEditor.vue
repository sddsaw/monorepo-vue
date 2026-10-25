<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const tpStore = useTpStore()
const showRawJson = ref(false)

const item = computed(() => props.data || {})

function updateField(field: string, value: any) {
  if (props.dataPath) {
    tpStore.updateItemField(props.dataPath, field, value)
  }
}

function handleNumberInput(field: string, event: Event) {
  const target = event.target as HTMLInputElement
  const num = Number(target.value)
  updateField(field, Number.isNaN(num) ? target.value : num)
}

function handleStringInput(field: string, event: Event) {
  const target = event.target as HTMLInputElement
  updateField(field, target.value)
}
</script>

<template>
  <div class="max-w-4xl select-text p-6 text-gray-200">
    <!-- 头部动作栏 -->
    <div class="mb-6 flex items-center justify-between border-b border-[#333333] pb-4">
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 flex items-center justify-center border border-blue-500/50 rounded bg-blue-600/20 text-blue-400 font-bold">
          ⚡
        </div>
        <div>
          <h2 class="text-lg text-white font-bold tracking-wide">
            {{ item.name || item.testName || '开短路测试 (Continuity)' }}
          </h2>
          <div class="text-xs text-gray-400 font-mono">
            测试项类型: Continuity / Contact Test
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="cursor-pointer border border-[#444444] rounded bg-[#252526] px-2.5 py-1 text-xs transition-colors hover:bg-[#333333]"
          @click="showRawJson = !showRawJson"
        >
          {{ showRawJson ? '收起底层 JSON' : '🔍 实时底层 JSON' }}
        </button>
      </div>
    </div>

    <!-- 参数配置表单网格 -->
    <div class="grid grid-cols-2 mb-6 gap-6 border border-[#333333] rounded-lg bg-[#252526] p-5">
      <!-- 测试项名称 -->
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">测试项名称 (Test Name):</label>
        <input
          type="text"
          :value="item.name || item.testName || ''"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          @input="handleStringInput('name', $event)"
        >
      </div>

      <!-- 加流参数 -->
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">强制灌流 (Force Current / mA):</label>
        <input
          type="number"
          step="0.1"
          :value="item.forceCurrent ?? -1.0"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          @input="handleNumberInput('forceCurrent', $event)"
        >
      </div>

      <!-- 门限下限 -->
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">低限阈值 (Low Limit / V):</label>
        <input
          type="number"
          step="0.05"
          :value="item.loLimit ?? item.lowLimit ?? -1.2"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          @input="handleNumberInput('loLimit', $event)"
        >
      </div>

      <!-- 门限上限 -->
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">高限阈值 (High Limit / V):</label>
        <input
          type="number"
          step="0.05"
          :value="item.hiLimit ?? item.highLimit ?? -0.2"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          @input="handleNumberInput('hiLimit', $event)"
        >
      </div>

      <!-- 钳位电压 -->
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">电压钳位 (Clamp Voltage / V):</label>
        <input
          type="number"
          step="0.1"
          :value="item.clampVoltage ?? 2.0"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          @input="handleNumberInput('clampVoltage', $event)"
        >
      </div>

      <!-- 采样等待时间 -->
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">采样等待延时 (Wait Time / ms):</label>
        <input
          type="number"
          :value="item.waitTime ?? 5"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          @input="handleNumberInput('waitTime', $event)"
        >
      </div>
    </div>

    <!-- 关联 Pin 脚 -->
    <div class="mb-6 border border-[#333333] rounded-lg bg-[#252526] p-5">
      <div class="mb-3 flex items-center justify-between text-xs text-gray-400 font-semibold">
        <span>关联测试管脚 (Target Pins)</span>
        <span class="text-11px text-gray-500">共 {{ Array.isArray(item.pins) ? item.pins.length : 0 }} 个管脚</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="pin in (Array.isArray(item.pins) ? item.pins : ['PIN_IO0', 'PIN_IO1', 'PIN_CLK', 'PIN_RST', 'PIN_TX', 'PIN_RX'])"
          :key="pin"
          class="border border-[#3e3e42] rounded bg-[#1e1e1e] px-2 py-1 text-xs text-blue-300 font-mono"
        >
          {{ pin }}
        </span>
      </div>
    </div>

    <!-- 底层原始 JSON 实时抽屉/折叠块 -->
    <div v-if="showRawJson" class="border border-[#333333] rounded-lg bg-[#181818] p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs text-gray-400 font-mono">底层原始 JSON (实时双向联动更新):</span>
        <span class="text-11px text-green-400">● 实时同步</span>
      </div>
      <pre class="max-h-60 overflow-auto rounded bg-black/60 p-3 text-xs text-green-400 font-mono">{{ JSON.stringify(item, null, 2) }}</pre>
    </div>
  </div>
</template>
