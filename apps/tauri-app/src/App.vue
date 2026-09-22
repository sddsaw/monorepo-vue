<script setup lang="ts">
import type { WatermarkProps } from 'naive-ui'
import { listen } from '@tauri-apps/api/event'
import { darkTheme, dateZhCN, NConfigProvider, zhCN } from 'naive-ui'
import { computed, onMounted } from 'vue'
import { isTauri } from './plugins/tauri'
import { useAppStore } from './store/modules/app'
import { useThemeStore } from './store/modules/theme'

defineOptions({
  name: 'App',
})

const appStore = useAppStore()
const themeStore = useThemeStore()

onMounted(async () => {
  if (isTauri()) {
    await listen('open-settings', () => {
      appStore.openThemeDrawer()
    })
  }
})

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined))

const watermarkProps = computed<WatermarkProps>(() => {
  return {
    content: themeStore.watermarkContent,
    cross: true,
    fullscreen: true,
    fontSize: 16,
    lineHeight: 16,
    width: 384,
    height: 384,
    xOffset: 12,
    yOffset: 60,
    rotate: -15,
    zIndex: 9999,
  }
})
</script>

<template>
  <NConfigProvider
    :theme="naiveDarkTheme"
    :theme-overrides="themeStore.naiveTheme"
    :locale="zhCN"
    :date-locale="dateZhCN"
    class="h-full"
  >
    <AppProvider>
      <RouterView class="bg-layout" />
      <NWatermark v-if="themeStore.watermark.visible" v-bind="watermarkProps" />
    </AppProvider>
  </NConfigProvider>
</template>

<style scoped></style>
