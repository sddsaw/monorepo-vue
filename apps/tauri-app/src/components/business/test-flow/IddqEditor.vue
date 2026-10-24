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
</script>

<template>
  <div class="p-6 text-gray-200 select-text max-w-4xl">
    <div class="flex items-center justify-between border-b border-[#333333] pb-4 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold">
          🔋
        </div>
        <div>
          <h2 class="text-lg font-bold text-white tracking-wide">
            {{ item.name || item.testName || '静态功耗电流测试 (IDDQ)' }}
          </h2>
          <div class="text-xs text-gray-400 font-mono">
            测试项类型: IDDQ / Quiescent Current
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="showRawJson = !showRawJson"
        class="px-2.5 py-1 text-xs rounded border border-[#444444] bg-[#252526] hover:bg-[#333333] transition-colors cursor-pointer"
      >
        {{ showRawJson ? '收起底层 JSON' : '🔍 实时底层 JSON' }}
      </button>
    </div>

    <!-- IDDQ 参数网格 -->
    <div class="grid grid-cols-2 gap-6 bg-[#252526] p-5 rounded-lg border border-[#333333] mb-6">
      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">供电电压 VDD (V):</label>
        <input
          type="number"
          step="0.05"
          :value="item.vddVoltage ?? 3.3"
          @input="handleNumberInput('vddVoltage', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-emerald-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">静态电流上限 HiLimit (uA):</label>
        <input
          type="number"
          step="1"
          :value="item.hiLimit ?? item.highLimit ?? 50"
          @input="handleNumberInput('hiLimit', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-emerald-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">静态电流下限 LoLimit (uA):</label>
        <input
          type="number"
          step="0.1"
          :value="item.loLimit ?? item.lowLimit ?? 0.0"
          @input="handleNumberInput('loLimit', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-emerald-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-400 mb-1.5">测量积分周期 (NPLC):</label>
        <input
          type="number"
          step="1"
          :value="item.nplc ?? 1"
          @input="handleNumberInput('nplc', $event)"
          class="w-full bg-[#1e1e1e] border border-[#3e3e42] focus:border-emerald-500 rounded px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>
    </div>

    <!-- 底层 JSON -->
    <div v-if="showRawJson" class="bg-[#181818] border border-[#333333] rounded-lg p-4">
      <pre class="bg-black/60 p-3 rounded text-green-400 font-mono text-xs overflow-auto max-h-60">{{ JSON.stringify(item, null, 2) }}</pre>
    </div>
  </div>
</template>
