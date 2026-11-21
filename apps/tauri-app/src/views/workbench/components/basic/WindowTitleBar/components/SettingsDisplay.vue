<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import { NInputNumber, NSelect } from 'naive-ui'
import { computed } from 'vue'
import { $t } from '@/locales'
import { useAppStore } from '@/store/modules/app'
import { useThemeStore } from '@/store/modules/theme'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import FontSizeSetting from './FontSizeSetting.vue'
import SettingsSection from './SettingsSection.vue'

const appStore = useAppStore()
const themeStore = useThemeStore()
const layoutStore = useWorkbenchLayoutStore()

const selectedLanguage = computed({
  get: () => appStore.locale,
  set: (value: 'zh-CN' | 'en-US') => appStore.changeLocale(value),
})

const zoomPercent = computed<number | null>({
  get: () => Math.round(layoutStore.zoomLevel * 100),
  set: (value) => {
    if (value !== null)
      layoutStore.setZoomLevel(value / 100)
  },
})

const languageOptions: SelectOption[] = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

const interfaceFontOptions: SelectOption[] = [
  { label: 'DBX Default', value: 'dbx-default' },
  { label: 'System Default', value: 'system-default' },
  { label: '思源宋体 · Noto Serif SC', value: 'noto-serif-sc' },
  { label: '思源黑体 · Noto Sans SC', value: 'noto-sans-sc' },
  { label: 'Inter, system-ui', value: 'Inter' },
  { label: '苹方 · PingFang SC（内置）', value: 'PingFang SC' },
  { label: 'Segoe UI, Roboto', value: 'Segoe UI' },
]
</script>

<template>
  <!-- 分组 2: 界面与排版 -->
  <SettingsSection :title="$t('workbench.settings.displayAndTypography')">
    <!-- 语言设置 -->
    <div class="settings-row flex items-center justify-between gap-4 py-4px">
      <div>
        <div class="text-base-text font-medium text-ui-13">
          {{ $t('workbench.settings.language') }}
        </div>
        <div class="text-[var(--text-muted)] text-ui-12">
          {{ $t('workbench.settings.languageDesc') }}
        </div>
      </div>
      <NSelect
        v-model:value="selectedLanguage"
        :options="languageOptions"
        :aria-label="$t('workbench.settings.language')"
        size="small"
        class="w-200px"
      />
    </div>

    <div class="h-[1px] w-full bg-[var(--hover-color)]" />

    <!-- 界面缩放 -->
    <div class="settings-row flex items-center justify-between gap-4 py-4px">
      <div>
        <div class="text-base-text font-medium text-ui-13">
          {{ $t('workbench.settings.zoom') }}
        </div>
        <div class="text-[var(--text-muted)] text-ui-12">
          {{ $t('workbench.settings.zoomDesc') }}
        </div>
      </div>
      <NInputNumber
        v-model:value="zoomPercent"
        :aria-label="$t('workbench.settings.zoom')"
        :min="60"
        :max="200"
        :step="10"
        size="small"
        class="w-200px"
      >
        <template #suffix>
          %
        </template>
      </NInputNumber>
    </div>

    <div class="h-[1px] w-full bg-[var(--hover-color)]" />

    <!-- 界面字体 -->
    <div class="settings-row flex items-center justify-between gap-4 py-4px">
      <div>
        <div class="text-base-text font-medium text-ui-13">
          {{ $t('workbench.settings.interfaceFont') }}
        </div>
        <div class="text-[var(--text-muted)] text-ui-12">
          {{ $t('workbench.settings.interfaceFontDesc') }}
        </div>
      </div>
      <NSelect
        v-model:value="themeStore.interfaceFont"
        :options="interfaceFontOptions"
        :aria-label="$t('workbench.settings.interfaceFont')"
        size="small"
        class="w-200px"
      />
    </div>
    <div class="h-[1px] w-full bg-[var(--hover-color)]" />
    <FontSizeSetting :value="themeStore.fontSize" @update:value="themeStore.setFontSize" />
  </SettingsSection>
</template>
