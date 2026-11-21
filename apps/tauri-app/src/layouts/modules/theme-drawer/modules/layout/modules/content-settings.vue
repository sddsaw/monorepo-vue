<script setup lang="ts">
import { computed } from 'vue'
import { themePageAnimationModeOptions, themeScrollModeOptions } from '@/constants/app'
import { $t } from '@/locales'
import { useThemeStore } from '@/store/modules/theme'
import SettingItem from '../../../components/setting-item.vue'

defineOptions({
  name: 'ContentSettings',
})

// 工作台与标准布局滚动范围不同，仅替换说明文案，配置仍共用。
withDefaults(defineProps<{ scrollTip?: string, showTitle?: boolean }>(), { showTitle: true })

const themeStore = useThemeStore()
const scrollOptions = computed(() => themeScrollModeOptions.map(option => ({
  ...option,
  label: $t(`theme.layout.content.scrollMode.${option.value}` as const),
})))
const animationOptions = computed(() => themePageAnimationModeOptions.map(option => ({
  ...option,
  label: $t(`theme.layout.content.page.mode.${option.value}` as const),
})))

const isWrapperScrollMode = computed(() => themeStore.layout.scrollMode === 'wrapper')
</script>

<template>
  <NDivider v-if="showTitle">
    {{ $t('theme.layout.content.title') }}
  </NDivider>
  <TransitionGroup tag="div" name="setting-list" class="flex-col-stretch gap-12px">
    <SettingItem key="1" :label="$t('theme.layout.content.scrollMode.title')">
      <template #suffix>
        <IconTooltip :desc="scrollTip || $t('theme.layout.content.scrollMode.tip')" />
      </template>
      <NSelect
        v-model:value="themeStore.layout.scrollMode"
        :options="scrollOptions"
        size="small"
        class="w-120px"
      />
    </SettingItem>
    <SettingItem key="2" :label="$t('theme.layout.content.page.animate')">
      <NSwitch v-model:value="themeStore.page.animate" :aria-label="$t('theme.layout.content.page.animate')" />
    </SettingItem>
    <SettingItem v-if="themeStore.page.animate" key="3" :label="$t('theme.layout.content.page.mode.title')">
      <NSelect
        v-model:value="themeStore.page.animateMode"
        :options="animationOptions"
        size="small"
        class="w-120px"
      />
    </SettingItem>
    <SettingItem v-if="isWrapperScrollMode" key="4" :label="$t('theme.layout.content.fixedHeaderAndTab')">
      <NSwitch v-model:value="themeStore.fixedHeaderAndTab" :aria-label="$t('theme.layout.content.fixedHeaderAndTab')" />
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
