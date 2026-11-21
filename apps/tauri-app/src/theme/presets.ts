import { defu } from 'defu'
import { themeSettings } from './settings'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

export type ThemePreset = DeepPartial<App.Theme.ThemeSetting> & {
  name: string
  desc: string
  version: string
  scope?: 'appearance'
  naiveui?: App.Theme.NaiveUIThemeOverride
}

const appearanceKeys = [
  'themeScheme',
  'grayscale',
  'colourWeakness',
  'recommendColor',
  'themeColor',
  'themeRadius',
  'fontSize',
  'otherColor',
  'isInfoFollowPrimary',
  'tokens',
] as const satisfies readonly (keyof App.Theme.ThemeSetting)[]

/** 每次从默认值补全预设，避免上一个预设的专属样式残留。 */
export function resolveThemePreset(preset: ThemePreset, current: App.Theme.ThemeSetting, appearanceOnly = false) {
  const merged = defu(preset, themeSettings)
  const keys = appearanceOnly || preset.scope === 'appearance'
    ? appearanceKeys
    : Object.keys(themeSettings) as (keyof App.Theme.ThemeSetting)[]
  // 字体属于个人偏好，完整布局预设也不覆盖它。
  const changes = Object.fromEntries(keys.filter(key => key !== 'interfaceFont').map(key => [key, merged[key]]))

  // 设置是可序列化数据；复制嵌套值，避免修改响应式设置时污染 JSON 预设或默认值。
  return {
    settings: JSON.parse(JSON.stringify({ ...current, ...changes })) as App.Theme.ThemeSetting,
    overrides: preset.naiveui
      ? JSON.parse(JSON.stringify(preset.naiveui)) as App.Theme.NaiveUIThemeOverride
      : undefined,
  }
}
