<script setup lang="ts">
import type { WatermarkProps } from 'naive-ui'
import { darkTheme, NConfigProvider, NGlobalStyle } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import ProjectLoadFeedback from '@/components/project/ProjectLoadFeedback.vue'
import { naiveDateLocales, naiveLocales } from './locales'
import { useAppEventListener } from './services/events'
import { useAppStore } from './store/modules/app'
import { useThemeStore } from './store/modules/theme'
import { interfaceFontFamily } from './theme/interface-font'

defineOptions({
  name: 'App',
})

const appStore = useAppStore()
const themeStore = useThemeStore()
const watermarkRevision = ref(0)

// 中文字体按需加载；首次下载完成后重画 Canvas，避免水印停留在回退字体。
watch([() => themeStore.watermark.visible, () => themeStore.watermarkContent, interfaceFontFamily], async ([visible, content, family], _, onCleanup) => {
  if (!visible || !content || !document.fonts)
    return
  const font = `16px ${family}`
  if (document.fonts.check(font, content))
    return
  let active = true
  onCleanup(() => {
    active = false
  })
  try {
    await document.fonts.load(font, content)
    if (active)
      watermarkRevision.value++
  }
  catch (error) {
    console.warn('水印字体加载失败，使用回退字体', error)
  }
}, { immediate: true })

useAppEventListener('open-settings', () => {
  appStore.openThemeDrawer()
})

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined))

const naiveLocale = computed(() => {
  return naiveLocales[appStore.locale]
})

const naiveDateLocale = computed(() => {
  return naiveDateLocales[appStore.locale]
})

const watermarkProps = computed<WatermarkProps>(() => {
  return {
    content: themeStore.watermarkContent,
    fontFamily: interfaceFontFamily.value,
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
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
    class="h-full"
  >
    <NGlobalStyle />
    <AppProvider>
      <RouterView class="bg-layout" />
      <ProjectLoadFeedback />
      <NWatermark v-if="themeStore.watermark.visible" :key="watermarkRevision" v-bind="watermarkProps" />
    </AppProvider>
  </NConfigProvider>
</template>

<style scoped></style>
