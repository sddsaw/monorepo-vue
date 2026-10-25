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
  <div class="max-w-4xl select-text p-6 text-gray-200">
    <div class="mb-6 flex items-center justify-between border-b border-[#333333] pb-4">
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 flex items-center justify-center border border-emerald-500/50 rounded bg-emerald-600/20 text-emerald-400 font-bold">
          🔋
        </div>
        <div>
          <h2 class="text-lg text-white font-bold tracking-wide">
            {{ item.name || item.testName || '静态功耗电流测试 (IDDQ)' }}
          </h2>
          <div class="text-xs text-gray-400 font-mono">
            测试项类型: IDDQ / Quiescent Current
          </div>
        </div>
      </div>

      <button
        type="button"
        class="cursor-pointer border border-[#444444] rounded bg-[#252526] px-2.5 py-1 text-xs transition-colors hover:bg-[#333333]"
        @click="showRawJson = !showRawJson"
      >
        {{ showRawJson ? '收起底层 JSON' : '🔍 实时底层 JSON' }}
      </button>
    </div>

    <!-- IDDQ 参数网格 -->
    <div class="grid grid-cols-2 mb-6 gap-6 border border-[#333333] rounded-lg bg-[#252526] p-5">
      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">供电电压 VDD (V):</label>
        <input
          type="number"
          step="0.05"
          :value="item.vddVoltage ?? 3.3"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
          @input="handleNumberInput('vddVoltage', $event)"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">静态电流上限 HiLimit (uA):</label>
        <input
          type="number"
          step="1"
          :value="item.hiLimit ?? item.highLimit ?? 50"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
          @input="handleNumberInput('hiLimit', $event)"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">静态电流下限 LoLimit (uA):</label>
        <input
          type="number"
          step="0.1"
          :value="item.loLimit ?? item.lowLimit ?? 0.0"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
          @input="handleNumberInput('loLimit', $event)"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-gray-400 font-semibold">测量积分周期 (NPLC):</label>
        <input
          type="number"
          step="1"
          :value="item.nplc ?? 1"
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
          @input="handleNumberInput('nplc', $event)"
        >
      </div>
    </div>

    <!-- 底层 JSON -->
    <div v-if="showRawJson" class="border border-[#333333] rounded-lg bg-[#181818] p-4">
      <pre class="max-h-60 overflow-auto rounded bg-black/60 p-3 text-xs text-green-400 font-mono">{{ JSON.stringify(item, null, 2) }}</pre>
    </div>
  </div>
</template>
