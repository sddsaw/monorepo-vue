<script setup lang="ts">
import { NButton, NInputNumber } from 'naive-ui'
import { $t } from '@/locales'
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE, normalizeFontSize } from '@/theme/typography'

defineProps<{ value: number }>()
const emit = defineEmits<{ 'update:value': [value: number] }>()
</script>

<template>
  <div class="settings-row flex flex-wrap items-center justify-between gap-3 py-1">
    <div class="min-w-0 flex-1 basis-160px">
      <label for="interface-font-size" class="text-base-text font-medium text-ui-13">
        {{ $t('workbench.settings.fontSize') }}
      </label>
      <div id="interface-font-size-help" class="text-[var(--text-muted)] text-ui-11">
        {{ $t('workbench.settings.fontSizeDesc', { min: MIN_FONT_SIZE, max: MAX_FONT_SIZE, default: DEFAULT_FONT_SIZE }) }}
      </div>
    </div>
    <div class="min-w-0 flex flex-wrap items-center gap-2">
      <NInputNumber
        :value="value"
        :min="MIN_FONT_SIZE"
        :max="MAX_FONT_SIZE"
        :step="1"
        :precision="0"
        :update-value-on-input="false"
        :input-props="{ 'id': 'interface-font-size', 'aria-describedby': 'interface-font-size-help' }"
        size="small"
        class="w-110px"
        @update:value="emit('update:value', normalizeFontSize($event))"
      >
        <template #suffix>
          px
        </template>
      </NInputNumber>
      <NButton size="small" :disabled="value === DEFAULT_FONT_SIZE" @click="emit('update:value', DEFAULT_FONT_SIZE)">
        {{ $t('workbench.settings.resetFontSize') }}
      </NButton>
    </div>
  </div>
</template>
