import type { GlobalThemeOverrides } from 'naive-ui'

/**
 * 根据主题配置生成 Naive UI 主题覆盖对象
 * 严格遵循 4px, 8px, 12px 设计系统 Token
 *
 * @param settings 主题配置
 */
export function createNaiveTheme(settings: App.Theme.ThemeSetting): GlobalThemeOverrides {
  const { themeColor, otherColor } = settings

  return {
    common: {
      primaryColor: themeColor,
      primaryColorHover: '#1a8ad6',
      primaryColorPressed: '#0062a3',
      primaryColorSuppl: themeColor,
      infoColor: otherColor.info,
      successColor: otherColor.success,
      warningColor: otherColor.warning,
      errorColor: otherColor.error,
      borderRadius: `${settings.themeRadius}px`,
      borderRadiusSmall: '4px',
    },
    Button: {
      borderRadiusMedium: '8px',
      borderRadiusSmall: '4px',
      borderRadiusLarge: '8px',
      borderRadiusTiny: '4px',
    },
    Card: {
      borderRadius: '12px',
    },
    Modal: {
      borderRadius: '12px',
    },
    Dialog: {
      borderRadius: '12px',
    },
    Input: {
      borderRadius: '8px',
    },
  }
}
