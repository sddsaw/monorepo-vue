import { useBoolean } from '@sa/hooks'
import { breakpointsTailwind, useBreakpoints, useEventListener, useTitle } from '@vueuse/core'
import { defineStore } from 'pinia'
import { effectScope, nextTick, onScopeDispose, ref, watch } from 'vue'
import { SetupStoreId } from '@/enum'
import { $t, setDayjsLocale, setLocale } from '@/locales'
import { isTauri } from '@/plugins/tauri'
import { router } from '@/router'
import { emitAppEvent, useAppEventListener } from '@/services/events'
import { localStg } from '@/utils/storage'
import { useRouteStore } from '../route'
import { useTabStore } from '../tab'
import { useThemeStore } from '../theme'

export const useAppStore = defineStore(SetupStoreId.App, () => {
  const themeStore = useThemeStore()
  const routeStore = useRouteStore()
  const tabStore = useTabStore()
  const scope = effectScope()
  const breakpoints = useBreakpoints(breakpointsTailwind)
  const { bool: themeDrawerVisible, setTrue: openThemeDrawer, setFalse: closeThemeDrawer } = useBoolean()
  const { bool: reloadFlag, setBool: setReloadFlag } = useBoolean(true)
  const { bool: fullContent, toggle: toggleFullContent } = useBoolean()
  const { bool: contentXScrollable, setBool: setContentXScrollable } = useBoolean()
  const { bool: siderCollapse, setBool: setSiderCollapse, toggle: toggleSiderCollapse } = useBoolean()
  const {
    bool: mixSiderFixed,
    setBool: setMixSiderFixed,
    toggle: toggleMixSiderFixed,
  } = useBoolean(localStg.get('mixSiderFixed') === 'Y')

  /** 是否运行在 Tauri 原生桌面环境 */
  const inTauri = isTauri()

  /** 应用标题 */
  const title = ref<string>(import.meta.env.VITE_APP_TITLE || 'Soybean Desktop')

  /** Is mobile layout */
  const isMobile = breakpoints.smaller('sm')

  const locale = ref<App.I18n.LangType>(localStg.get('lang') || 'zh-CN')

  const localeOptions: App.I18n.LangOption[] = [
    {
      label: '中文',
      key: 'zh-CN',
    },
    {
      label: 'English',
      key: 'en-US',
    },
  ]

  function changeLocale(lang: App.I18n.LangType) {
    if (locale.value === lang) {
      return
    }
    locale.value = lang
    setLocale(lang)
    localStg.set('lang', lang)
    emitAppEvent('locale:change', lang)
  }

  /** Update document title by locale */
  function updateDocumentTitleByLocale() {
    const { name, meta } = router.currentRoute.value
    const { i18nKey, title: routeTitle } = meta

    const resolvedKey = (i18nKey || (name ? `route.${String(name)}` : '')) as App.I18n.I18nKey
    const translated = resolvedKey ? $t(resolvedKey) : ''
    const documentTitle = (translated && translated !== resolvedKey) ? translated : routeTitle

    if (documentTitle) {
      useTitle(documentTitle)
      if (inTauri) {
        import('@tauri-apps/api/window')
          .then(({ getCurrentWindow }) => getCurrentWindow().setTitle(documentTitle))
          .catch(() => {})
      }
    }
  }

  function init() {
    setLocale(locale.value)
    setDayjsLocale(locale.value)
  }

  init()

  /**
   * Reload page
   *
   * @param duration Duration time
   */
  async function reloadPage(duration = 300) {
    setReloadFlag(false)

    const d = themeStore.page.animate ? duration : 40

    await new Promise((resolve) => {
      setTimeout(resolve, d)
    })

    setReloadFlag(true)
    routeStore.resetRouteCache()
  }

  // watch store
  scope.run(() => {
    // watch isMobile, if is mobile, collapse sider
    watch(
      isMobile,
      (newValue) => {
        if (newValue) {
          // backup theme setting before is mobile
          localStg.set('backupThemeSettingBeforeIsMobile', {
            layout: themeStore.layout.mode,
            siderCollapse: siderCollapse.value,
          })

          themeStore.setThemeLayout('vertical')
          setSiderCollapse(true)
        }
        else {
          // when is not mobile, recover the backup theme setting
          const backup = localStg.get('backupThemeSettingBeforeIsMobile')

          if (backup) {
            nextTick(() => {
              themeStore.setThemeLayout(backup.layout)
              setSiderCollapse(backup.siderCollapse)

              localStg.remove('backupThemeSettingBeforeIsMobile')
            })
          }
        }
      },
      { immediate: true },
    )

    // watch locale
    watch(locale, () => {
      // update document title by locale
      updateDocumentTitleByLocale()

      // update global menus by locale
      routeStore.updateGlobalMenusByLocale()

      // update tabs by locale
      tabStore.updateTabsByLocale()

      // set dayjs locale
      setDayjsLocale(locale.value)
    })

    // 监听跨窗口语言切换事件（同步子窗口语言状态）
    useAppEventListener('locale:change', (newLang) => {
      if (locale.value !== newLang) {
        locale.value = newLang
        setLocale(newLang)
      }
    })
  })

  // cache mixSiderFixed
  useEventListener(window, 'beforeunload', () => {
    localStg.set('mixSiderFixed', mixSiderFixed.value ? 'Y' : 'N')
  })

  /** On scope dispose */
  onScopeDispose(() => {
    scope.stop()
  })

  return {
    inTauri,
    title,
    isMobile,
    reloadFlag,
    reloadPage,
    fullContent,
    locale,
    localeOptions,
    changeLocale,
    updateDocumentTitleByLocale,
    themeDrawerVisible,
    openThemeDrawer,
    closeThemeDrawer,
    toggleFullContent,
    contentXScrollable,
    setContentXScrollable,
    siderCollapse,
    setSiderCollapse,
    toggleSiderCollapse,
    mixSiderFixed,
    setMixSiderFixed,
    toggleMixSiderFixed,
  }
})
