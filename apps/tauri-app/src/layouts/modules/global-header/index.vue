<script setup lang="ts">
import { useFullscreen } from '@vueuse/core'
import { computed } from 'vue'
import LangSwitch from '@/components/common/lang-switch.vue'
import { GLOBAL_HEADER_MENU_ID } from '@/constants/app'
import { isTauri } from '@/plugins/tauri'
import { useAppStore } from '@/store/modules/app'
import { useThemeStore } from '@/store/modules/theme'
import GlobalBreadcrumb from '../global-breadcrumb/index.vue'
import GlobalLogo from '../global-logo/index.vue'
import GlobalSearch from '../global-search/index.vue'
import DesktopTools from './components/desktop-tools.vue'
import NotificationBell from './components/notification-bell.vue'
import ThemeButton from './components/theme-button.vue'
import UserAvatar from './components/user-avatar.vue'

defineOptions({
  name: 'GlobalHeader',
})

defineProps<Props>()

interface Props {
  /** Whether to show the logo */
  showLogo?: App.Global.HeaderProps['showLogo']
  /** Whether to show the menu toggler */
  showMenuToggler?: App.Global.HeaderProps['showMenuToggler']
  /** Whether to show the menu */
  showMenu?: App.Global.HeaderProps['showMenu']
}

const appStore = useAppStore()
const themeStore = useThemeStore()
const { isFullscreen, toggle } = useFullscreen()

const isMac = computed(() => {
  if (typeof navigator === 'undefined')
    return false
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
})
</script>

<template>
  <DarkModeContainer
    data-tauri-drag-region
    class="h-full flex-y-center select-none px-12px shadow-header"
    :class="[isTauri() && isMac ? 'pl-[78px]' : '']"
  >
    <GlobalLogo v-if="showLogo" data-tauri-drag-region="false" class="h-full" :style="{ width: `${themeStore.sider.width}px` }" />
    <MenuToggler v-if="showMenuToggler" data-tauri-drag-region="false" :collapsed="appStore.siderCollapse" @click="appStore.toggleSiderCollapse" />
    <div v-if="showMenu" :id="GLOBAL_HEADER_MENU_ID" data-tauri-drag-region="false" class="h-full flex-y-center flex-1-hidden" />
    <div v-else class="h-full flex-y-center flex-1-hidden">
      <GlobalBreadcrumb v-if="!appStore.isMobile" data-tauri-drag-region="false" class="ml-12px" />
    </div>
    <div class="h-full flex-y-center justify-end" data-tauri-drag-region="false">
      <GlobalSearch v-if="themeStore.header.globalSearch.visible" />
      <FullScreen v-if="!appStore.isMobile" :full="isFullscreen" @click="toggle" />
      <LangSwitch
        v-if="themeStore.header.multilingual.visible"
        :lang="appStore.locale"
        :lang-options="appStore.localeOptions"
        @change-lang="appStore.changeLocale"
      />
      <ThemeSchemaSwitch
        :theme-schema="themeStore.themeScheme"
        :is-dark="themeStore.darkMode"
        @switch="themeStore.toggleThemeScheme"
      />
      <NotificationBell />
      <ThemeButton />
      <UserAvatar />
      <DesktopTools />
    </div>
  </DarkModeContainer>
</template>

<style scoped></style>
