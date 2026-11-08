<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import { SvgIcon } from '@sa/components'
import {
  NCard,
  NEmpty,
  NInput,
  NSelect,
  NSpace,
  NTable,
  NTag,
} from 'naive-ui'
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'PinTableEditor',
})

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const tpStore = useTpStore()
const filterText = ref('')

const pinTypeOptions: SelectOption[] = [
  { label: 'Digital (数字)', value: 'Digital' },
  { label: 'BIDIR (双向)', value: 'BIDIR' },
  { label: 'Power (电源)', value: 'Power' },
  { label: 'Analog (模拟)', value: 'Analog' },
  { label: 'Ground (地)', value: 'Ground' },
  { label: 'RF (射频)', value: 'RF' },
]

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
  return list.filter(item =>
    item.pinName.toLowerCase().includes(q) || String(item.channel).toLowerCase().includes(q) || String(item.type).toLowerCase().includes(q),
  )
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
  <div class="business-editor-container max-w-5xl select-text p-6 text-gray-200">
    <!-- 头部动作栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-8px bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:grid-line" class="text-20px" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-16px text-white font-bold tracking-wide">
              芯片管脚分配表 (PinMap Configuration)
            </h2>
            <NTag type="warning" size="small" round :bordered="false" class="font-mono">
              Pin Table
            </NTag>
          </div>
          <p class="mt-0.5 text-12px text-gray-400">
            ATE 测试机台通道映射、芯片物理管脚类型与多工位定义
          </p>
        </div>
      </div>

      <!-- 搜索过滤栏 -->
      <div class="w-64">
        <NInput
          v-model:value="filterText"
          size="small"
          placeholder="搜索管脚名称 / 通道 / 类型..."
          clearable
        >
          <template #prefix>
            <SvgIcon icon="ri:search-line" class="text-gray-500" />
          </template>
        </NInput>
      </div>
    </div>

    <!-- 高密度管脚表格卡片 -->
    <NCard
      size="small"
      class="editor-card border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-[#3e3e42]"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-13px text-gray-300 font-semibold">物理管脚通道映射表</span>
          <span class="text-11px text-gray-500">
            当前显示 {{ pinEntries.length }} 项
          </span>
        </div>
      </div>

      <div v-if="pinEntries.length === 0" class="py-12">
        <NEmpty description="未检索到匹配的管脚数据" />
      </div>

      <div v-else class="overflow-x-auto rounded-6px border border-[#2d2d2d]">
        <NTable size="small" :single-line="false" class="business-table">
          <thead>
            <tr class="bg-[#2a2a2c] text-gray-400 text-11px font-semibold">
              <th>管脚名称 (Pin Name)</th>
              <th class="w-36">
                机台通道 (Channel)
              </th>
              <th class="w-48">
                管脚类型 (Pin Type)
              </th>
              <th class="w-28 text-center">
                测试工位 (Site)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in pinEntries"
              :key="entry.pinName"
              class="table-row-hover transition-colors duration-150"
            >
              <!-- 管脚名称 -->
              <td>
                <span class="font-mono text-12px font-medium text-amber-300/90 tracking-wide">
                  {{ entry.pinName }}
                </span>
              </td>

              <!-- 机台通道 -->
              <td>
                <NTag size="tiny" class="font-mono" :bordered="false">
                  {{ entry.channel }}
                </NTag>
              </td>

              <!-- 管脚类型选择器 -->
              <td>
                <NSelect
                  size="tiny"
                  :value="entry.type"
                  :options="pinTypeOptions"
                  class="w-full"
                  @update:value="updatePinType(entry.pinName, $event)"
                />
              </td>

              <!-- 测试工位 -->
              <td class="text-center font-mono text-11px text-gray-400">
                Site {{ entry.site }}
              </td>
            </tr>
          </tbody>
        </NTable>
      </div>
    </NCard>
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

.table-row-hover:hover {
  background-color: rgba(255, 255, 255, 0.04);
}
</style>
