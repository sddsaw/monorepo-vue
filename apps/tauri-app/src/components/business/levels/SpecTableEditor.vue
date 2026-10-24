<script setup lang="ts">
import { computed } from 'vue'
import { useTpStore } from '@/store/modules/tp'

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const tpStore = useTpStore()

const specEntries = computed(() => {
  const source = props.data || {}
  const list = Object.entries(source).map(([specKey, val]) => {
    const detail = typeof val === 'object' && val !== null ? val : { val }
    return {
      specKey,
      typ: detail.typ ?? detail.val ?? 0,
      min: detail.min ?? '-',
      max: detail.max ?? '-',
      unit: detail.unit ?? 'V',
      comment: detail.comment || '',
    }
  })
  return list
})

function updateSpecTyp(specKey: string, newValue: number) {
  if (!props.dataPath)
    return
  const current = props.data?.[specKey]
  if (typeof current === 'object' && current !== null) {
    tpStore.updateItemField([...props.dataPath, specKey], 'typ', newValue)
  }
  else {
    tpStore.updateItemField(props.dataPath, specKey, newValue)
  }
}
</script>

<template>
  <div class="p-6 text-gray-200 select-text max-w-5xl">
    <div class="border-b border-[#333333] pb-4 mb-4">
      <h2 class="text-lg font-bold text-white tracking-wide">直流电平规格表 (DC Levels & Specs)</h2>
      <div class="text-xs text-gray-400 font-mono">规范芯片工作电平基准 (VIH, VIL, VOH, VOL, VCC)</div>
    </div>

    <div class="border border-[#333333] rounded overflow-hidden">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-[#252526] text-gray-400 font-semibold border-b border-[#333333]">
          <tr>
            <th class="p-2.5">参数名 (Parameter)</th>
            <th class="p-2.5">下限 (Min)</th>
            <th class="p-2.5">典型值 (Typical)</th>
            <th class="p-2.5">上限 (Max)</th>
            <th class="p-2.5">单位 (Unit)</th>
            <th class="p-2.5">说明 (Comment)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#2d2d2d] bg-[#1e1e1e]">
          <tr v-for="spec in specEntries" :key="spec.specKey" class="hover:bg-[#252526] transition-colors">
            <td class="p-2.5 font-mono font-medium text-cyan-400">{{ spec.specKey }}</td>
            <td class="p-2.5 font-mono text-gray-400">{{ spec.min }}</td>
            <td class="p-2.5">
              <input
                type="number"
                step="0.05"
                :value="spec.typ"
                @input="updateSpecTyp(spec.specKey, Number(($event.target as HTMLInputElement).value))"
                class="bg-[#2d2d2d] border border-[#444444] rounded px-2 py-0.5 text-xs text-white font-mono w-24 outline-none focus:border-cyan-500"
              />
            </td>
            <td class="p-2.5 font-mono text-gray-400">{{ spec.max }}</td>
            <td class="p-2.5 font-mono text-gray-400">{{ spec.unit }}</td>
            <td class="p-2.5 text-gray-500 text-11px">{{ spec.comment || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
