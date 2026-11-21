import type { GlobalThemeOverrides } from 'naive-ui'
import { addColorAlpha, getColorPalette, getPaletteColorByNumber, getRgb } from '@sa/color'
import { toggleHtmlClass } from '@sa/utils'
import { defu } from 'defu'
import { DARK_CLASS } from '@/constants/app'
import { normalizeInterfaceFont } from '@/theme/interface-font'
import { overrideThemeSettings, themeSettings } from '@/theme/settings'
import { getTypographyTheme, normalizeFontSize } from '@/theme/typography'
import { themeVars } from '@/theme/vars'
import { localStg } from '@/utils/storage'

/** Init theme settings */
export function initThemeSettings() {
  // 用户设置在开发、生产和新版本中均优先，默认配置只补齐新增字段。
  const settings = defu(localStg.get('themeSettings'), overrideThemeSettings, themeSettings)
  settings.fontSize = normalizeFontSize(settings.fontSize)
  settings.interfaceFont = normalizeInterfaceFont(settings.interfaceFont)
  return settings
}

/**
 * create theme token css vars value by theme settings
 *
 * @param colors Theme colors
 * @param tokens Theme setting tokens
 * @param [recommended] Use recommended color. Default is `false`
 */
export function createThemeToken(
  colors: App.Theme.ThemeColor,
  tokens?: App.Theme.ThemeSetting['tokens'],
  recommended = false,
  isInfoFollowPrimary = false,
) {
  const { light, dark } = tokens || themeSettings.tokens
  const lightColors = getModeThemeColors(colors, tokens, false, isInfoFollowPrimary)
  const darkColors = getModeThemeColors(colors, tokens, true, isInfoFollowPrimary)

  const themeTokens: App.Theme.ThemeTokenCSSVars = {
    colors: {
      ...createThemePaletteColors(lightColors, recommended),
      nprogress: lightColors.primary,
      ...light.colors,
    },
    boxShadow: {
      ...light.boxShadow,
    },
  }

  const darkThemeTokens: App.Theme.ThemeTokenCSSVars = {
    colors: {
      ...themeTokens.colors,
      ...createThemePaletteColors(darkColors, recommended),
      nprogress: dark?.colors?.nprogress ?? light.colors.nprogress ?? darkColors.primary,
      ...dark?.colors,
    },
    boxShadow: {
      ...themeTokens.boxShadow,
      ...dark?.boxShadow,
    },
  }

  return {
    themeTokens,
    darkThemeTokens,
  }
}

/** 预设可以为明暗模式提供主色，CSS、组件库和标签栏共用同一解析规则。 */
export function getModeThemeColors(
  colors: App.Theme.ThemeColor,
  tokens: App.Theme.ThemeSetting['tokens'] | undefined,
  darkMode: boolean,
  isInfoFollowPrimary: boolean,
): App.Theme.ThemeColor {
  const primary = (darkMode ? tokens?.dark : tokens?.light)?.colors?.primary ?? colors.primary
  return { ...colors, primary, info: isInfoFollowPrimary ? primary : colors.info }
}

/**
 * Create theme palette colors
 *
 * @param colors Theme colors
 * @param [recommended] Use recommended color. Default is `false`
 */
function createThemePaletteColors(colors: App.Theme.ThemeColor, recommended = false) {
  const colorKeys = Object.keys(colors) as App.Theme.ThemeColorKey[]
  const colorPaletteVar = {} as App.Theme.ThemePaletteColor

  colorKeys.forEach((key) => {
    const colorMap = getColorPalette(colors[key], recommended)

    // 基础色始终使用全局设置值；推荐色阶只用于衍生状态，不能另改 CSS 主色。
    colorPaletteVar[key] = colors[key]

    colorMap.forEach((hex, number) => {
      colorPaletteVar[`${key}-${number}`] = hex
    })
  })

  return colorPaletteVar
}

/**
 * Get css var by tokens
 *
 * @param tokens Theme base tokens
 */
function getCssVarByTokens(tokens: App.Theme.ThemeTokenCSSVars) {
  const styles: string[] = []

  function removeVarPrefix(value: string) {
    return value.replace('var(', '').replace(')', '')
  }

  function removeRgbPrefix(value: string) {
    return value.replace('rgb(', '').replace(')', '')
  }

  for (const [key, tokenValues] of Object.entries(themeVars)) {
    for (const [tokenKey, tokenValue] of Object.entries(tokenValues)) {
      let cssVarsKey = removeVarPrefix(tokenValue as string)
      let cssValue = tokens[key as keyof App.Theme.ThemeTokenCSSVars][tokenKey]

      if (key === 'colors') {
        cssVarsKey = removeRgbPrefix(cssVarsKey)
        const { r, g, b } = getRgb(cssValue)
        cssValue = `${r} ${g} ${b}`
      }

      styles.push(`${cssVarsKey}: ${cssValue}`)
    }
  }

  const styleStr = styles.join(';')

  return styleStr
}

/**
 * Add theme vars to global
 *
 * @param tokens
 */
export function addThemeVarsToGlobal(tokens: App.Theme.ThemeTokenCSSVars, darkTokens: App.Theme.ThemeTokenCSSVars) {
  const cssVarStr = getCssVarByTokens(tokens)
  const darkCssVarStr = getCssVarByTokens(darkTokens)

  const css = `
    :root {
      ${cssVarStr}
    }
  `

  const darkCss = `
    html.${DARK_CLASS} {
      ${darkCssVarStr}
    }
  `

  const styleId = 'theme-vars'

  const style = document.querySelector(`#${styleId}`) || document.createElement('style')

  style.id = styleId

  style.textContent = css + darkCss

  document.head.appendChild(style)
}

/**
 * Toggle css dark mode
 *
 * @param darkMode Is dark mode
 */
export function toggleCssDarkMode(darkMode = false) {
  const { add, remove } = toggleHtmlClass(DARK_CLASS)

  if (darkMode) {
    add()
  }
  else {
    remove()
  }
}

/**
 * Toggle auxiliary color modes
 *
 * @param grayscaleMode
 * @param colourWeakness
 */
export function toggleAuxiliaryColorModes(grayscaleMode = false, colourWeakness = false) {
  const htmlElement = document.documentElement
  htmlElement.style.filter = [grayscaleMode ? 'grayscale(100%)' : '', colourWeakness ? 'invert(80%)' : '']
    .filter(Boolean)
    .join(' ')
}

type NaiveColorScene = '' | 'Suppl' | 'Hover' | 'Pressed' | 'Active'
type NaiveColorKey = `${App.Theme.ThemeColorKey}Color${NaiveColorScene}`
type NaiveThemeColor = Partial<Record<NaiveColorKey, string>>
interface NaiveColorAction {
  scene: NaiveColorScene
  handler: (color: string) => string
}

/**
 * Get naive theme colors
 *
 * @param colors Theme colors
 * @param [recommended] Use recommended color. Default is `false`
 */
function getNaiveThemeColors(colors: App.Theme.ThemeColor, recommended = false, darkMode = false) {
  const colorActions: NaiveColorAction[] = [
    { scene: '', handler: color => color },
    { scene: 'Suppl', handler: color => color },
    { scene: 'Hover', handler: color => getPaletteColorByNumber(color, 500, recommended) },
    // 暗色实心按钮使用黑字，按下时取亮色阶，避免深色背景吞掉文字。
    { scene: 'Pressed', handler: color => getPaletteColorByNumber(color, darkMode ? 400 : 700, recommended) },
    { scene: 'Active', handler: color => addColorAlpha(color, 0.1) },
  ]

  const themeColors: NaiveThemeColor = {}

  const colorEntries = Object.entries(colors) as [App.Theme.ThemeColorKey, string][]

  colorEntries.forEach((color) => {
    colorActions.forEach((action) => {
      const [colorType, colorValue] = color
      const colorKey: NaiveColorKey = `${colorType}Color${action.scene}`
      themeColors[colorKey] = action.handler(colorValue)
    })
  })

  return themeColors
}

/** 所有界面及非 DOM 渲染器共用的全局表面颜色。 */
export function getThemeSurfaceColors(settings: App.Theme.ThemeSetting, darkMode: boolean) {
  const { light, dark } = settings.tokens
  const colors = { ...light.colors, ...(darkMode ? dark?.colors : {}) }
  const text = colors['base-text']
  const surfaces = { ...light.surfaces, ...(darkMode ? dark?.surfaces : {}) }
  return {
    container: colors.container,
    layout: colors.layout,
    text,
    muted: surfaces.muted ?? addColorAlpha(text, 0.65),
    border: surfaces.border ?? addColorAlpha(text, 0.16),
    hover: surfaces.hover ?? addColorAlpha(text, 0.08),
    panel: surfaces.panel ?? colors.layout,
    toolbar: surfaces.toolbar ?? colors.container,
    input: surfaces.input ?? colors.container,
    alternate: surfaces.alternate ?? 'transparent',
  }
}

/**
 * Get naive theme
 *
 * @param colors Theme colors
 * @param settings Theme settings object
 * @param overrides Optional manual overrides from preset
 */
export function getNaiveTheme(
  colors: App.Theme.ThemeColor,
  settings: App.Theme.ThemeSetting,
  overrides?: GlobalThemeOverrides,
  darkMode = false,
) {
  const modeColors = getModeThemeColors(colors, settings.tokens, darkMode, settings.isInfoFollowPrimary)
  const { primary: colorLoading } = modeColors
  const surface = getThemeSurfaceColors(settings, darkMode)
  const inputBorder = `1px solid ${surface.border}`

  const theme: GlobalThemeOverrides = {
    common: {
      ...getTypographyTheme(settings.fontSize),
      ...getNaiveThemeColors(modeColors, settings.recommendColor, darkMode),
      fontFamily: 'var(--wb-interface-font, var(--wb-default-interface-font))',
      bodyColor: surface.layout,
      cardColor: surface.container,
      modalColor: surface.container,
      popoverColor: surface.container,
      tableColor: surface.container,
      inputColor: surface.input,
      textColorBase: surface.text,
      textColor1: surface.text,
      textColor2: surface.muted,
      textColor3: surface.muted,
      borderColor: surface.border,
      dividerColor: surface.border,
      borderRadius: `${settings.themeRadius}px`,
    },
    Card: { borderRadius: `${settings.themeRadius}px` },
    // 暗色主题默认使用透明边框，与统一面板背景重合时无法辨认输入区域。
    Input: {
      color: surface.input,
      borderRadius: `${settings.themeRadius}px`,
      border: inputBorder,
      borderDisabled: inputBorder,
      groupLabelBorder: inputBorder,
    },
    InternalSelection: { border: inputBorder, color: surface.input },
    Alert: { borderRadius: `${settings.themeRadius}px` },
    LoadingBar: {
      colorLoading,
    },
    Tag: {
      borderRadius: `${settings.themeRadius}px`,
    },
  }

  // 全局颜色与圆角始终优先，预设仅补充其余组件样式。
  return overrides ? defu(theme, overrides) : theme
}
