<script setup lang="ts">
import { NSelect } from 'naive-ui'
import { computed } from 'vue'
import { themeTabModeOptions } from '@/constants/app'
import SettingItem from '@/layouts/modules/theme-drawer/components/setting-item.vue'
import ThemeColor from '@/layouts/modules/theme-drawer/modules/appearance/modules/theme-color.vue'
import WatermarkSettings from '@/layouts/modules/theme-drawer/modules/general/modules/watermark-settings.vue'
import ContentSettings from '@/layouts/modules/theme-drawer/modules/layout/modules/content-settings.vue'
import ThemePreset from '@/layouts/modules/theme-drawer/modules/preset/modules/theme-preset.vue'
import { $t } from '@/locales'
import { useThemeStore } from '@/store/modules/theme'
import SettingsDisplay from './SettingsDisplay.vue'
import SettingsSection from './SettingsSection.vue'
import SettingsVisual from './SettingsVisual.vue'

const themeStore = useThemeStore()
const tabModeOptions = computed(() => themeTabModeOptions.map(option => ({
  ...option,
  label: $t(`theme.layout.tab.mode.${option.value}` as const),
})))
</script>

<template>
  <div class="settings-appearance space-y-24px">
    <ThemePreset appearance-only />
    <SettingsVisual />

    <SettingsSection :title="$t('theme.appearance.themeColor.title')">
      <ThemeColor :show-title="false" />
    </SettingsSection>

    <SettingsDisplay />

    <SettingsSection :title="$t('theme.layout.content.title')">
      <SettingItem :label="$t('theme.layout.tab.mode.title')">
        <NSelect v-model:value="themeStore.tab.mode" :options="tabModeOptions" :aria-label="$t('theme.layout.tab.mode.title')" size="small" class="w-200px" />
      </SettingItem>
      <ContentSettings :show-title="false" :scroll-tip="$t('workbench.settings.scrollModeTip')" />
    </SettingsSection>

    <SettingsSection :title="$t('theme.general.watermark.title')">
      <WatermarkSettings :show-title="false" />
    </SettingsSection>
  </div>
</template>

<style scoped>
.settings-appearance :deep(.settings-row) {
  flex-wrap: wrap;
  gap: 12px;
}

.settings-appearance :deep(.settings-row > div:first-child) {
  flex: 1 1 160px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.settings-appearance :deep(.settings-row > .n-select),
.settings-appearance :deep(.settings-row > .n-input-number),
.settings-appearance :deep(.settings-row > .n-radio-group) {
  flex-shrink: 0;
  max-width: 100%;
}
</style>
