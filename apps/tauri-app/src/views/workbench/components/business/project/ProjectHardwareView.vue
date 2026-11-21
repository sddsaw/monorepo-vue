<script setup lang="ts">
import { NAlert, NDescriptions, NDescriptionsItem, NTag } from 'naive-ui'

defineProps<{
  data: { label: string, source: string, note: string, values: Record<string, unknown> }
  dataPath?: (string | number)[]
}>()
</script>

<template>
  <section class="hardware-view select-text p-24px text-base-text">
    <header class="mb-24px flex flex-wrap items-start justify-between gap-12px">
      <div>
        <h2 class="mb-8px font-600 text-ui-20">
          {{ data.label }}
        </h2>
        <p class="text-[var(--text-muted)] font-mono text-ui-12">
          {{ data.source }}
        </p>
      </div>
      <NTag size="small">
        配置预览
      </NTag>
    </header>
    <NAlert v-if="data.note" type="info" class="mb-16px">
      {{ data.note }}
    </NAlert>
    <NDescriptions bordered :column="1" size="small">
      <NDescriptionsItem v-for="(value, key) in data.values" :key="key" :label="String(key)">
        <span class="break-all font-mono">{{ value === null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value) }}</span>
      </NDescriptionsItem>
    </NDescriptions>
  </section>
</template>
