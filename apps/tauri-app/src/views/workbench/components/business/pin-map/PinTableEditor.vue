<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import { SvgIcon } from '@sa/components'
import {
  NCard,
  NEmpty,
  NInput,
  NSelect,
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
  <div class="business-editor-container max-w-5xl select-text p-6 text-base-text">
    <!-- 头部动作栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-[var(--theme-radius)] bg-warning/15 text-warning ring-1 ring-warning/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:grid-line" class="text-ui-20" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base-text font-bold tracking-wide text-ui-16">
              芯片管脚分配表 (PinMap Configuration)
            </h2>
            <NTag type="warning" size="small" round :bordered="false" class="font-mono">
              Pin Table
            </NTag>
          </div>
          <p class="mt-0.5 text-[var(--text-muted)] text-ui-12">
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
            <SvgIcon icon="ri:search-line" class="text-[var(--text-muted)]" />
          </template>
        </NInput>
      </div>
    </div>

    <!-- 高密度管脚表格卡片 -->
    <NCard
      size="small"
      class="editor-card border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container transition-all duration-300 hover:border-[var(--border-color)]"
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base-text font-semibold text-ui-13">物理管脚通道映射表</span>
          <span class="text-[var(--text-muted)] text-ui-11">
            当前显示 {{ pinEntries.length }} 项
          </span>
        </div>
      </div>

      <div v-if="pinEntries.length === 0" class="py-12">
        <NEmpty description="未检索到匹配的管脚数据" />
      </div>

      <div v-else class="overflow-x-auto border border-[var(--border-color)] rounded-[var(--theme-radius)]">
        <NTable size="small" :single-line="false" class="business-table">
          <thead>
            <tr class="bg-layout text-[var(--text-muted)] font-semibold text-ui-11">
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
                <span class="text-warning/90 font-medium tracking-wide font-mono text-ui-12">
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
              <td class="text-center text-[var(--text-muted)] font-mono text-ui-11">
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
.editor-card {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.editor-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.table-row-hover:hover {
  background-color: var(--hover-color);
}
</style>
