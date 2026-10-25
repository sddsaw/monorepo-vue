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
  <div class="max-w-5xl select-text p-6 text-gray-200">
    <div class="mb-4 border-b border-[#333333] pb-4">
      <h2 class="text-lg text-white font-bold tracking-wide">
        直流电平规格表 (DC Levels & Specs)
      </h2>
      <div class="text-xs text-gray-400 font-mono">
        规范芯片工作电平基准 (VIH, VIL, VOH, VOL, VCC)
      </div>
    </div>

    <div class="overflow-hidden border border-[#333333] rounded">
      <table class="w-full border-collapse text-left text-xs">
        <thead class="border-b border-[#333333] bg-[#252526] text-gray-400 font-semibold">
          <tr>
            <th class="p-2.5">
              参数名 (Parameter)
            </th>
            <th class="p-2.5">
              下限 (Min)
            </th>
            <th class="p-2.5">
              典型值 (Typical)
            </th>
            <th class="p-2.5">
              上限 (Max)
            </th>
            <th class="p-2.5">
              单位 (Unit)
            </th>
            <th class="p-2.5">
              说明 (Comment)
            </th>
          </tr>
        </thead>
        <tbody class="bg-[#1e1e1e] divide-y divide-[#2d2d2d]">
          <tr v-for="spec in specEntries" :key="spec.specKey" class="transition-colors hover:bg-[#252526]">
            <td class="p-2.5 text-cyan-400 font-medium font-mono">
              {{ spec.specKey }}
            </td>
            <td class="p-2.5 text-gray-400 font-mono">
              {{ spec.min }}
            </td>
            <td class="p-2.5">
              <input
                type="number"
                step="0.05"
                :value="spec.typ"
                class="w-24 border border-[#444444] rounded bg-[#2d2d2d] px-2 py-0.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                @input="updateSpecTyp(spec.specKey, Number(($event.target as HTMLInputElement).value))"
              >
            </td>
            <td class="p-2.5 text-gray-400 font-mono">
              {{ spec.max }}
            </td>
            <td class="p-2.5 text-gray-400 font-mono">
              {{ spec.unit }}
            </td>
            <td class="p-2.5 text-11px text-gray-500">
              {{ spec.comment || '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
