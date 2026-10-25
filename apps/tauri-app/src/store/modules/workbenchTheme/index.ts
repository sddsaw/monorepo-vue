import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SetupStoreId } from '@/enum'
import { getStoreValue, setStoreValue } from '@/services/store'
import {
  parseVsCodeTheme,
  PRESET_WORKBENCH_THEMES,
  type WorkbenchThemeTokens,
} from '@/theme/workbenchTheme'

export const useWorkbenchThemeStore = defineStore(SetupStoreId.WorkbenchTheme, () => {
  const currentThemeId = ref<string>('vscode-dark')
  const customTokens = ref<WorkbenchThemeTokens | null>(null)

  /** 当前生效的主题 Tokens */
  const currentTheme = computed<WorkbenchThemeTokens>(() => {
    if (customTokens.value && customTokens.value.id === currentThemeId.value) {
      return customTokens.value
    }
    return PRESET_WORKBENCH_THEMES[currentThemeId.value] || PRESET_WORKBENCH_THEMES['vscode-dark']
  })

  /** 将当前主题颜色变量注入到 DOM 根节点 */
  function applyThemeCssVariables() {
    if (typeof document === 'undefined')
      return

    const t = currentTheme.value
    const root = document.documentElement

    root.style.setProperty('--wb-titlebar-bg', t.titleBarBg)
    root.style.setProperty('--wb-activitybar-bg', t.activityBarBg)
    root.style.setProperty('--wb-sidebar-bg', t.sidebarBg)
    root.style.setProperty('--wb-editor-bg', t.editorBg)
    root.style.setProperty('--wb-bottompanel-bg', t.bottomPanelBg)
    root.style.setProperty('--wb-statusbar-bg', t.statusBarBg)
    root.style.setProperty('--wb-accent-color', t.accentColor)
    root.style.setProperty('--wb-border-color', t.borderColor)
    root.style.setProperty('--wb-text-color', t.textColor)
    root.style.setProperty('--wb-text-secondary', t.textSecondaryColor)

    // Dockview 核心分屏样式联动
    root.style.setProperty('--dv-activegroup-visiblepanel-tab-background-color', t.editorBg)
    root.style.setProperty('--dv-tabs-and-actions-container-background-color', t.sidebarBg)
    root.style.setProperty('--dv-separator-border', t.borderColor)
    root.style.setProperty('--dv-drag-over-background-color', `${t.accentColor}33`)

    // 暗黑 / 明亮属性切换
    if (t.isDark) {
      root.classList.add('dark')
    }
    else {
      root.classList.remove('dark')
    }
  }

  /** 切换预设主题 */
  async function setTheme(themeId: string) {
    if (PRESET_WORKBENCH_THEMES[themeId]) {
      currentThemeId.value = themeId
      applyThemeCssVariables()
      await setStoreValue('workbench_theme_id', themeId)
    }
  }

  /** 设置自定义主题 */
  async function setCustomTheme(tokens: WorkbenchThemeTokens) {
    customTokens.value = tokens
    currentThemeId.value = tokens.id
    applyThemeCssVariables()
    await setStoreValue('workbench_theme_id', tokens.id)
    await setStoreValue('workbench_custom_theme', tokens)
  }

  /** 导入外部 VS Code 官方主题 JSON */
  async function importVsCodeTheme(rawJson: string | Record<string, any>) {
    let parsed: Record<string, any>
    if (typeof rawJson === 'string') {
      parsed = JSON.parse(rawJson)
    }
    else {
      parsed = rawJson
    }

    const tokens = parseVsCodeTheme(parsed)
    await setCustomTheme(tokens)
    return tokens
  }

  /** 初始化加载持久化的主题配置 */
  async function initTheme() {
    try {
      const savedThemeId = await getStoreValue<string>('workbench_theme_id', 'vscode-dark')
      const savedCustom = await getStoreValue<WorkbenchThemeTokens>('workbench_custom_theme')

      if (savedCustom) {
        customTokens.value = savedCustom
      }

      if (savedThemeId) {
        if (savedThemeId.endsWith('dark')) {
          currentThemeId.value = 'vscode-dark'
        }
        else if (savedThemeId.endsWith('light')) {
          currentThemeId.value = 'vscode-light'
        }
        else {
          currentThemeId.value = savedThemeId
        }
      }
    }
    catch {
      // 容错回退
      currentThemeId.value = 'vscode-dark'
    }
    finally {
      applyThemeCssVariables()
    }
  }

  return {
    currentThemeId,
    customTokens,
    currentTheme,
    applyThemeCssVariables,
    setTheme,
    setCustomTheme,
    importVsCodeTheme,
    initTheme,
  }
})
