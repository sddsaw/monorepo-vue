<script setup lang="ts">
import { NAlert, NDescriptions, NDescriptionsItem, NTag } from 'naive-ui'
import { computed } from 'vue'
import DefinitionTable from './DefinitionTable.vue'

const props = defineProps<{
  data: { title: string, type: string, path: string, content: Record<string, unknown>, warnings: string[] }
  dataPath?: (string | number)[]
}>()
const tables = computed(() => {
  const labels: Record<string, string> = { individualPins: 'Individual Pins · 管脚定义', pinGroups: 'Pin Groups · 管脚分组', jobs: 'Jobs · 作业配置', data: props.data.title }
  return Object.entries(props.data.content).filter(([, value]) => Array.isArray(value)).map(([key, value]) => ({
    key,
    title: labels[key] ?? key,
    rows: (value as unknown[]).map(row => row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : { value: row }),
  }))
})
const details = computed(() => Object.entries(props.data.content).filter(([key, value]) =>
  !Array.isArray(value) && !['metadata', 'version', 'DefFileType'].includes(key),
))
const display = (value: unknown) => value === null ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
</script>

<template>
  <div class="definition-view min-w-0 select-text p-24px text-base-text">
    <header class="mb-24px flex flex-wrap items-start justify-between gap-12px">
      <div>
        <h2 class="mb-8px font-600 text-ui-20">
          {{ data.title }}
        </h2>
        <p class="break-all text-[var(--text-muted)] font-mono text-ui-12">
          {{ data.path }}
        </p>
      </div>
      <NTag size="small">
        只读 · {{ data.type }}
      </NTag>
    </header>
    <NAlert v-for="warning in data.warnings" :key="warning" type="warning" class="mb-16px">
      {{ warning }}
    </NAlert>
    <NDescriptions v-if="details.length" bordered :column="1" size="small" class="mb-24px">
      <NDescriptionsItem v-for="[key, value] in details" :key="key" :label="key">
        <span class="whitespace-pre-wrap break-all font-mono">{{ display(value) }}</span>
      </NDescriptionsItem>
    </NDescriptions>
    <div class="flex flex-col gap-24px">
      <DefinitionTable v-for="table in tables" :key="table.key" :title="table.title" :rows="table.rows" />
    </div>
    <NAlert v-if="!tables.length" type="info">
      此定义没有数据行。
    </NAlert>
  </div>
</template>
