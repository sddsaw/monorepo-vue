export const MIN_FONT_SIZE = 12
export const DEFAULT_FONT_SIZE = 14
export const MAX_FONT_SIZE = 18

/** UI、旧缓存及跨窗口消息共用相同边界。 */
export function normalizeFontSize(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
}

/** 保留原有文字层级；小字有可读性下限，默认字号下保持原始尺寸。 */
export function getUiFontSize(size: number, base: number): number {
  return Math.max(Math.min(size, 11), Number((size * normalizeFontSize(base) / DEFAULT_FONT_SIZE).toFixed(2)))
}

export function uiFontSizeCss(size: number): string {
  return `max(${Math.min(size, 11)}px, calc(var(--app-font-size, 14px) * ${size} / 14))`
}

/** 紧凑控件随大字号增长，小字号下不缩小点击区域。 */
export function uiControlSizeCss(size: number): string {
  return `max(${size}px, calc(var(--app-font-size, 14px) * ${size} / 14))`
}

export function getTypographyTheme(value: unknown) {
  const base = normalizeFontSize(value)
  const font = (size: number) => `${getUiFontSize(size, base)}px`
  const height = (size: number) => `${Math.ceil(size * Math.max(1, base / DEFAULT_FONT_SIZE))}px`
  return {
    fontSize: font(14),
    fontSizeMini: font(12),
    fontSizeTiny: font(12),
    fontSizeSmall: font(14),
    fontSizeMedium: font(14),
    fontSizeLarge: font(15),
    fontSizeHuge: font(16),
    heightMini: height(16),
    heightTiny: height(22),
    heightSmall: height(28),
    heightMedium: height(34),
    heightLarge: height(40),
    heightHuge: height(46),
  }
}
