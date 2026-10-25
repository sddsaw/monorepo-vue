<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const tpStore = useTpStore()
const filterText = ref('')

const pinEntries = computed(() => {
  const source = props.data || {}
  const list = Object.entries(source).map(([pinName, val]) => {
    const detail = typeof val === 'object' && val !== null ? val : { channel: val }
    return {
      pinName,
      channel: detail.channel || detail.pinNumber || '-',
      type: detail.type || detail.pinType || 'Digital',
      site: detail.site ?? 1,
    }
  })

  if (!filterText.value)
    return list
  const q = filterText.value.toLowerCase()
  return list.filter(item => item.pinName.toLowerCase().includes(q) || String(item.channel).toLowerCase().includes(q))
})

function updatePinType(pinName: string, newType: string) {
  if (!props.dataPath)
    return
  const currentPin = props.data?.[pinName]
  if (typeof currentPin === 'object' && currentPin !== null) {
    tpStore.updateItemField([...props.dataPath, pinName], 'type', newType)
  }
}
</script>

<template>
  <div class="max-w-5xl select-text p-6 text-gray-200">
    <div class="mb-4 flex items-center justify-between border-b border-[#333333] pb-4">
      <div>
        <h2 class="text-lg text-white font-bold tracking-wide">
          芯片管脚分配表 (PinMap Configuration)
        </h2>
        <div class="text-xs text-gray-400 font-mono">
          共 {{ pinEntries.length }} 个管脚已定义
        </div>
      </div>

      <div class="w-64">
        <input
          v-model="filterText"
          type="text"
          placeholder="过滤管脚或通道..."
          class="w-full border border-[#3e3e42] rounded bg-[#1e1e1e] px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
        >
      </div>
    </div>

    <!-- 高密度管脚表格 -->
    <div class="overflow-hidden border border-[#333333] rounded">
      <table class="w-full border-collapse text-left text-xs">
        <thead class="border-b border-[#333333] bg-[#252526] text-gray-400 font-semibold">
          <tr>
            <th class="p-2.5">
              管脚名称 (Pin Name)
            </th>
            <th class="p-2.5">
              机台通道 (Tester Channel)
            </th>
            <th class="p-2.5">
              管脚类型 (Pin Type)
            </th>
            <th class="p-2.5">
              测试工位 (Site)
            </th>
          </tr>
        </thead>
        <tbody class="bg-[#1e1e1e] divide-y divide-[#2d2d2d]">
          <tr v-for="entry in pinEntries" :key="entry.pinName" class="transition-colors hover:bg-[#252526]">
            <td class="p-2.5 text-yellow-400/90 font-medium font-mono">
              {{ entry.pinName }}
            </td>
            <td class="p-2.5 text-blue-300 font-mono">
              {{ entry.channel }}
            </td>
            <td class="p-2.5">
              <select
                :value="entry.type"
                class="border border-[#444444] rounded bg-[#2d2d2d] px-2 py-0.5 text-xs text-gray-200 outline-none"
                @change="updatePinType(entry.pinName, ($event.target as HTMLSelectElement).value)"
              >
                <option value="Digital">
                  Digital (数字)
                </option>
                <option value="Power">
                  Power (电源)
                </option>
                <option value="Analog">
                  Analog (模拟)
                </option>
                <option value="Ground">
                  Ground (地)
                </option>
                <option value="RF">
                  RF (射频)
                </option>
              </select>
            </td>
            <td class="p-2.5 text-gray-400 font-mono">
              Site {{ entry.site }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
