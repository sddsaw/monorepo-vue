import { shallowRef } from 'vue'
import { localStg } from '@/utils/storage'

// Canvas 不解析 var(...)，保存浏览器已解析的字体供水印使用。
export const interfaceFontFamily = shallowRef('sans-serif')

const interfaceFontMap: Record<string, string> = {
  'system-default': 'var(--wb-default-interface-font)',
  'noto-serif-sc': '"Noto Serif SC Variable", "Songti SC", SimSun, serif',
  'noto-sans-sc': '"Noto Sans SC Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
  'Inter': 'Inter, system-ui, sans-serif',
  'PingFang SC': '"Workbench PingFang SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  'Segoe UI': '"Segoe UI", Roboto, sans-serif',
}

export function normalizeInterfaceFont(font: unknown): string {
  return typeof font === 'string' && Object.hasOwn(interfaceFontMap, font) ? font : 'dbx-default'
}

export function applyInterfaceFont(font: unknown) {
  const root = document.documentElement
  if (typeof font === 'string' && Object.hasOwn(interfaceFontMap, font)) {
    root.style.setProperty('--wb-interface-font', interfaceFontMap[font])
  }
  else {
    root.style.removeProperty('--wb-interface-font')
  }
  interfaceFontFamily.value = getComputedStyle(root).fontFamily
}

/** 在界面挂载前恢复字体，避免依赖设置弹窗的生命周期。 */
export function restoreInterfaceFont() {
  applyInterfaceFont(localStg.get('themeSettings')?.interfaceFont)
}
