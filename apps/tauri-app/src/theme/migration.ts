import { defu } from 'defu'
import { getStoreValue } from '@/services/store'
import { localStg } from '@/utils/storage'
import { themeSettings } from './settings'

/** 只在首次升级时迁移旧工作台偏好（旧版也会写入 themeSettings），之后始终读取统一的 themeSettings。 */
export async function migrateThemeSettings() {
  if (localStg.get('themeMigrationVersion') === 1)
    return

  try {
    const saved = JSON.parse(localStorage.getItem('dbx_workbench_settings_v2') || '{}')
    const themeId = await getStoreValue<string>('workbench_theme_id') || saved.theme
    const custom = await getStoreValue<{ id: string, accentColor: string, isDark: boolean }>('workbench_custom_theme')
    const colors: Record<string, string> = {
      'cursor': '#3b82f6',
      'vscode-dark': '#007acc',
      'vscode-light': '#007acc',
      'one-dark-pro': '#61afef',
      'industrial-blue': '#58a6ff',
    }
    const legacy: Partial<App.Theme.ThemeSetting> = {}
    const customTheme = custom?.id === themeId ? custom : undefined
    const color = customTheme?.accentColor || colors[themeId]
    if (color)
      legacy.themeColor = color

    if (saved.themeMode === 'system')
      legacy.themeScheme = 'auto'
    else if (saved.themeMode === 'light' || saved.themeMode === 'dark')
      legacy.themeScheme = saved.themeMode
    else if (themeId)
      legacy.themeScheme = customTheme ? (customTheme.isDark ? 'dark' : 'light') : (themeId === 'vscode-light' ? 'light' : 'dark')

    const radii: Record<string, number> = { none: 0, small: 4, large: 10 }
    const radius = radii[saved.borderRadius]
    if (radius !== undefined)
      legacy.themeRadius = radius

    // 首次升级保留之前实际生效的工作台外观，其余全局设置保持原值。
    localStg.set('themeSettings', defu(legacy, localStg.get('themeSettings'), themeSettings))
    localStg.set('themeMigrationVersion', 1)
  }
  catch (error) {
    console.warn('旧主题配置迁移失败，使用全局默认主题', error)
  }
}
