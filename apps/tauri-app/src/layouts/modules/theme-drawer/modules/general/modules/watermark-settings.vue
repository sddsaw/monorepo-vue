<script setup lang="ts">
import { computed } from 'vue'
import { watermarkTimeFormatOptions } from '@/constants/app'
import { $t } from '@/locales'
import { useThemeStore } from '@/store/modules/theme'
import SettingItem from '../../../components/setting-item.vue'

defineOptions({
  name: 'WatermarkSettings',
})

withDefaults(defineProps<{ showTitle?: boolean }>(), { showTitle: true })

const themeStore = useThemeStore()

const isWatermarkTextVisible = computed(
  () => themeStore.watermark.visible && !themeStore.watermark.enableUserName && !themeStore.watermark.enableTime,
)
</script>

<template>
  <NDivider v-if="showTitle">
    {{ $t('theme.general.watermark.title') }}
  </NDivider>
  <TransitionGroup tag="div" name="setting-list" class="flex-col-stretch gap-12px">
    <SettingItem key="1" :label="$t('theme.general.watermark.visible')">
      <NSwitch v-model:value="themeStore.watermark.visible" :aria-label="$t('theme.general.watermark.visible')" />
    </SettingItem>
    <SettingItem v-if="themeStore.watermark.visible" key="2" :label="$t('theme.general.watermark.enableUserName')">
      <NSwitch :value="themeStore.watermark.enableUserName" :aria-label="$t('theme.general.watermark.enableUserName')" @update:value="themeStore.setWatermarkEnableUserName" />
    </SettingItem>
    <SettingItem v-if="themeStore.watermark.visible" key="3" :label="$t('theme.general.watermark.enableTime')">
      <NSwitch :value="themeStore.watermark.enableTime" :aria-label="$t('theme.general.watermark.enableTime')" @update:value="themeStore.setWatermarkEnableTime" />
    </SettingItem>
    <SettingItem
      v-if="themeStore.watermark.visible && themeStore.watermark.enableTime"
      key="4"
      :label="$t('theme.general.watermark.timeFormat')"
    >
      <NSelect
        v-model:value="themeStore.watermark.timeFormat"
        :options="watermarkTimeFormatOptions"
        size="small"
        class="w-210px"
      />
    </SettingItem>
    <SettingItem v-if="isWatermarkTextVisible" key="5" :label="$t('theme.general.watermark.text')">
      <NInput
        v-model:value="themeStore.watermark.text"
        type="text"
        size="small"
        class="w-210px"
        placeholder="Proxima"
      />
    </SettingItem>
  </TransitionGroup>
</template>

<style scoped>
.setting-list-move,
.setting-list-enter-active,
.setting-list-leave-active {
  --uno: transition-all-300;
}

.setting-list-enter-from,
.setting-list-leave-to {
  --uno: opacity-0 -translate-x-30px;
}

.setting-list-leave-active {
  --uno: absolute;
}
</style>
