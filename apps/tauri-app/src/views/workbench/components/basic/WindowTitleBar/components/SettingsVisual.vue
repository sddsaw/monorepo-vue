<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { NInputNumber, NRadioButton, NRadioGroup, NSwitch } from 'naive-ui'
import { computed } from 'vue'
import SettingItem from '@/layouts/modules/theme-drawer/components/setting-item.vue'
import { $t } from '@/locales'
import { useThemeStore } from '@/store/modules/theme'
import SettingsSection from './SettingsSection.vue'

const themeStore = useThemeStore()
const themeScheme = computed({
  get: () => themeStore.themeScheme,
  set: (scheme: UnionKey.ThemeScheme) => themeStore.setThemeScheme(scheme),
})
</script>

<template>
  <div class="space-y-24px">
    <!-- 分组 1: 主题与视觉模式 -->
    <SettingsSection :title="$t('workbench.settings.themeAndColor')">
      <!-- 主题模式 (Light / Dark / System) -->
      <div class="settings-row flex items-center justify-between gap-4 py-4px">
        <div>
          <div class="text-base-text font-medium text-ui-13">
            {{ $t('workbench.settings.appearanceMode') }}
          </div>
          <div class="text-[var(--text-muted)] text-ui-12">
            {{ $t('workbench.settings.appearanceModeDesc') }}
          </div>
        </div>
        <NRadioGroup
          v-model:value="themeScheme"
          :aria-label="$t('workbench.settings.appearanceMode')"
          size="small"
          class="settings-modes flex"
        >
          <NRadioButton value="light" class="flex-1 text-center text-ui-12">
            <div class="flex items-center justify-center gap-1">
              <SvgIcon icon="ri:sun-line" />
              <span>{{ $t('workbench.settings.light') }}</span>
            </div>
          </NRadioButton>
          <NRadioButton value="dark" class="flex-1 text-center text-ui-12">
            <div class="flex items-center justify-center gap-1">
              <SvgIcon icon="ri:moon-line" />
              <span>{{ $t('workbench.settings.dark') }}</span>
            </div>
          </NRadioButton>
          <NRadioButton value="auto" class="flex-1 text-center text-ui-12">
            <div class="flex items-center justify-center gap-1">
              <SvgIcon icon="ri:magic-line" />
              <span>{{ $t('workbench.settings.auto') }}</span>
            </div>
          </NRadioButton>
        </NRadioGroup>
      </div>
      <SettingItem :label="$t('theme.appearance.grayscale')">
        <NSwitch :value="themeStore.grayscale" :aria-label="$t('theme.appearance.grayscale')" @update:value="themeStore.setGrayscale" />
      </SettingItem>
      <SettingItem :label="$t('theme.appearance.colourWeakness')">
        <NSwitch :value="themeStore.colourWeakness" :aria-label="$t('theme.appearance.colourWeakness')" @update:value="themeStore.setColourWeakness" />
      </SettingItem>
    </SettingsSection>

    <!-- 圆角设置 -->
    <SettingsSection :title="$t('workbench.settings.frameAndLayout')">
      <!-- 圆角风格 -->
      <div class="settings-row flex items-center justify-between gap-4 py-4px">
        <div>
          <div class="text-base-text font-medium text-ui-13">
            {{ $t('workbench.settings.borderRadius') }}
          </div>
          <div class="text-[var(--text-muted)] text-ui-12">
            {{ $t('workbench.settings.borderRadiusDesc') }}
          </div>
        </div>
        <NInputNumber
          :value="themeStore.themeRadius"
          :aria-label="$t('workbench.settings.borderRadius')"
          :min="0"
          :max="20"
          size="small"
          class="w-200px"
          @update:value="themeStore.themeRadius = $event ?? 6"
        >
          <template #suffix>
            px
          </template>
        </NInputNumber>
      </div>
    </SettingsSection>
  </div>
</template>

<style scoped>
.settings-modes {
  width: max-content;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
