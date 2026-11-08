<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import {
  NCard,
  NEmpty,
  NInput,
  NInputNumber,
  NTable,
  NTag,
} from 'naive-ui'
import { computed, ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'SpecTableEditor',
})

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const tpStore = useTpStore()
const filterText = ref('')

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

  if (!filterText.value)
    return list
  const q = filterText.value.toLowerCase()
  return list.filter(item =>
    item.specKey.toLowerCase().includes(q) || item.comment.toLowerCase().includes(q),
  )
})

function updateSpecTyp(specKey: string, newValue: number | null) {
  if (!props.dataPath || newValue === null)
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
  <div class="business-editor-container max-w-5xl select-text p-6 text-gray-200">
    <!-- 头部动作栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-8px bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:sound-module-line" class="text-20px" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-16px text-white font-bold tracking-wide">
              直流电平规格表 (DC Levels & Specs)
            </h2>
            <NTag type="info" size="small" round :bordered="false" class="font-mono">
              Levels Table
            </NTag>
          </div>
          <p class="mt-0.5 text-12px text-gray-400">
            规范芯片输入输出工作电平基准 (VIH, VIL, VOH, VOL, VCC)
          </p>
        </div>
      </div>

      <!-- 搜索过滤栏 -->
      <div class="w-64">
        <NInput
          v-model:value="filterText"
          size="small"
          placeholder="搜索电平参数名称..."
          clearable
        >
          <template #prefix>
            <SvgIcon icon="ri:search-line" class="text-gray-500" />
          </template>
        </NInput>
      </div>
    </div>

    <!-- 高密度规格表格卡片 -->
    <NCard
      size="small"
      class="editor-card border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-[#3e3e42]"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-13px text-gray-300 font-semibold">直流规格参数明细</span>
          <span class="text-11px text-gray-500">
            当前显示 {{ specEntries.length }} 项参数
          </span>
        </div>
      </div>

      <div v-if="specEntries.length === 0" class="py-12">
        <NEmpty description="未检索到匹配的规格参数" />
      </div>

      <div v-else class="overflow-x-auto rounded-6px border border-[#2d2d2d]">
        <NTable size="small" :single-line="false" class="business-table">
          <thead>
            <tr class="bg-[#2a2a2c] text-gray-400 text-11px font-semibold">
              <th>参数名 (Parameter)</th>
              <th class="w-24 text-center">
                下限 (Min)
              </th>
              <th class="w-40 text-center">
                典型值 (Typical)
              </th>
              <th class="w-24 text-center">
                上限 (Max)
              </th>
              <th class="w-20 text-center">
                单位 (Unit)
              </th>
              <th>说明 (Comment)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="spec in specEntries"
              :key="spec.specKey"
              class="table-row-hover transition-colors duration-150"
            >
              <!-- 参数名 -->
              <td>
                <span class="font-mono text-12px font-medium text-cyan-300 tracking-wide">
                  {{ spec.specKey }}
                </span>
              </td>

              <!-- 下限 -->
              <td class="text-center font-mono text-11px text-gray-400">
                {{ spec.min }}
              </td>

              <!-- 典型值 (支持在表格中直接编辑修改) -->
              <td>
                <NInputNumber
                  size="tiny"
                  :value="Number(spec.typ)"
                  :step="0.05"
                  class="w-full text-center font-mono"
                  @update:value="updateSpecTyp(spec.specKey, $event)"
                />
              </td>

              <!-- 上限 -->
              <td class="text-center font-mono text-11px text-gray-400">
                {{ spec.max }}
              </td>

              <!-- 单位 -->
              <td class="text-center">
                <NTag size="tiny" :bordered="false" class="font-mono">
                  {{ spec.unit }}
                </NTag>
              </td>

              <!-- 说明 -->
              <td class="text-11px text-gray-400">
                {{ spec.comment || '-' }}
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
