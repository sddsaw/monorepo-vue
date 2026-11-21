<script setup lang="ts">
import { NDataTable } from 'naive-ui'
import { computed, h } from 'vue'

const props = defineProps<{ title: string, rows: Record<string, unknown>[] }>()
const columns = computed(() => [...new Set(props.rows.flatMap(row => Object.keys(row)))].map(key => ({
  key,
  title: key,
  width: key === 'comment' ? 280 : 170,
  resizable: true,
  render: (row: Record<string, unknown>) => {
    const value = row[key]
    const display = value === undefined || value === null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return h('span', { title: display, class: 'font-mono text-ui-13' }, display)
  },
})))
</script>

<template>
  <section class="min-w-0">
    <h3 class="mb-12px font-600 text-ui-14">
      {{ title }} <span class="ml-8px text-[var(--text-muted)]">{{ rows.length }} 条</span>
    </h3>
    <NDataTable
      :columns="columns"
      :data="rows"
      :scroll-x="columns.reduce((sum, col) => sum + col.width, 0)"
      :pagination="{ pageSize: 30 }"
      size="small"
      :bordered="true"
    />
  </section>
</template>
