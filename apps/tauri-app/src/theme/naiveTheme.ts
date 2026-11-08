import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import { computed } from 'vue'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'

/**
 * 为 ATE 可视化工作台提供与 VS Code 主题 Tokens 联动的 Naive UI 覆盖配置
 */
export function useNaiveWorkbenchTheme() {
  const themeStore = useWorkbenchThemeStore()

  const activeTheme = computed(() => (themeStore.currentTheme.isDark ? darkTheme : null))

  const themeOverrides = computed<GlobalThemeOverrides>(() => {
    const t = themeStore.currentTheme
    return {
      common: {
        primaryColor: t.accentColor,
        primaryColorHover: t.accentColor,
        primaryColorPressed: t.accentColor,
        primaryColorSuppl: t.accentColor,
        baseColor: t.editorBg,
        cardColor: t.sidebarBg,
        tableColor: t.editorBg,
        textColorBase: t.textColor,
        textColor1: t.textColor,
        textColor2: t.textSecondaryColor,
        borderColor: t.borderColor,
        dividerColor: t.borderColor,
        borderRadius: '4px',
        borderRadiusSmall: '2px',
      },
      DataTable: {
        thColor: t.sidebarBg,
        tdColor: t.editorBg,
        borderColor: t.borderColor,
        thTextColor: t.textColor,
        tdTextColor: t.textColor,
        thFontWeight: '600',
      },
      Tree: {
        nodeHeight: '22px',
        nodeWrapperPadding: '1px 0',
        fontSize: '12px',
        lineHeight: '20px',
        nodeColorHover: t.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        nodeColorActive: `${t.accentColor}33`,
        nodeTextColor: t.textColor,
      },
      Card: {
        color: t.sidebarBg,
        borderColor: t.borderColor,
        textColor: t.textColor,
        titleTextColor: t.textColor,
      },
      Button: {
        borderRadiusMedium: '4px',
        borderRadiusSmall: '2px',
      },
      Input: {
        color: t.isDark ? '#1e1e1e' : '#ffffff',
        colorFocus: t.isDark ? '#252526' : '#ffffff',
        borderColor: t.borderColor,
        textColor: t.textColor,
      },
      Tabs: {
        tabTextColorLine: t.textSecondaryColor,
        tabTextColorActiveLine: t.textColor,
        tabTextColorHoverLine: t.textColor,
        barColor: t.accentColor,
      },
    }
  })

  return { activeTheme, themeOverrides }
}
