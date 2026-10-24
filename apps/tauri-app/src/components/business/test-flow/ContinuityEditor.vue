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
  <div class="p-6 text-gray-200 select-text max-w-4xl">
    <!-- 头部动作栏 -->
    <div class="flex items-center justify-between border-b border-[#333333] pb-4 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
          ⚡
        </div>
        <div>
          <h2 class="text-lg font-bold text-white tracking-wide">
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
          @click="showRawJson = !showRawJson"
          class="px-2.5 py-1 text-xs rounded border border-[#444444] bg-[#252526] hover:bg-[#333333] transition-colors cursor-pointer"
        >
          {{ showRawJson ? '收起底层 JSON' : '🔍 实时底层 JSON' }}
        </button>
      </div>
    </div>

    <!-- 参数配置表单网格 -->
    <div class="grid grid-cols-2 gap-6 bg-[#252526] p-5 rounded-lg border border-[#333333] mb-6">
      <!-- 测试项名称 -->
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">测试项名称 (Test Name):</label>
        <input
          type="text"
          :value="item.name || item.testName || ''"
          @input="handleStringInput('name', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <!-- 加流参数 -->
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">强制灌流 (Force Current / mA):</label>
        <input
          type="number"
          step="0.1"
          :value="item.forceCurrent ?? -1.0"
          @input="handleNumberInput('forceCurrent', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <!-- 门限下限 -->
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">低限阈值 (Low Limit / V):</label>
        <input
          type="number"
          step="0.05"
          :value="item.loLimit ?? item.lowLimit ?? -1.2"
          @input="handleNumberInput('loLimit', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <!-- 门限上限 -->
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">高限阈值 (High Limit / V):</label>
        <input
          type="number"
          step="0.05"
          :value="item.hiLimit ?? item.highLimit ?? -0.2"
          @input="handleNumberInput('hiLimit', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <!-- 钳位电压 -->
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">电压钳位 (Clamp Voltage / V):</label>
        <input
          type="number"
          step="0.1"
          :value="item.clampVoltage ?? 2.0"
          @input="handleNumberInput('clampVoltage', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <!-- 采样等待时间 -->
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">采样等待延时 (Wait Time / ms):</label>
        <input
          type="number"
          :value="item.waitTime ?? 5"
          @input="handleNumberInput('waitTime', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>
    </div>

    <!-- 关联 Pin 脚 -->
    <div class="bg-[#252526] p-5 rounded-lg border border-[#333333] mb-6">
      <div class="text-xs font-semibold text-gray-400 mb-3 flex items-center justify-between">
        <span>关联测试管脚 (Target Pins)</span>
        <span class="text-gray-500 text-11px">共 {{ Array.isArray(item.pins) ? item.pins.length : 0 }} 个管脚</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="pin in (Array.isArray(item.pins) ? item.pins : ['PIN_IO0', 'PIN_IO1', 'PIN_CLK', 'PIN_RST', 'PIN_TX', 'PIN_RX'])"
          :key="pin"
          class="px-2 py-1 rounded bg-[#1e1e1e] border border-[#3e3e42] text-xs font-mono text-blue-300"
        >
          {{ pin }}
        </span>
      </div>
    </div>

    <!-- 底层原始 JSON 实时抽屉/折叠块 -->
    <div v-if="showRawJson" class="bg-[#181818] border border-[#333333] rounded-lg p-4">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-mono text-gray-400">底层原始 JSON (实时双向联动更新):</span>
        <span class="text-11px text-green-400">● 实时同步</span>
      </div>
      <pre class="bg-black/60 p-3 rounded text-green-400 font-mono text-xs overflow-auto max-h-60">{{ JSON.stringify(item, null, 2) }}</pre>
    </div>
  </div>
</template>
