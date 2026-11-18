export const WORKBENCH_SETTINGS_STORAGE_KEY = 'dbx_workbench_settings_v2'

const interfaceFontMap: Record<string, string> = {
  'system-default': 'var(--wb-default-interface-font)',
  'noto-serif-sc': '"Noto Serif SC Variable", "Songti SC", SimSun, serif',
  'noto-sans-sc': '"Noto Sans SC Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
  'Inter': 'Inter, system-ui, sans-serif',
  'PingFang SC': '"PingFang SC", "Microsoft YaHei", sans-serif',
  'Segoe UI': '"Segoe UI", Roboto, sans-serif',
}

export function applyInterfaceFont(font: unknown) {
  const root = document.documentElement
  if (typeof font === 'string' && Object.hasOwn(interfaceFontMap, font)) {
    root.style.setProperty('--wb-interface-font', interfaceFontMap[font])
  }
  else {
    root.style.removeProperty('--wb-interface-font')
  }
}

/** 在界面挂载前恢复字体，避免依赖设置弹窗的生命周期。 */
export function restoreInterfaceFont() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKBENCH_SETTINGS_STORAGE_KEY) || '{}')
    applyInterfaceFont(saved?.interfaceFont)
  }
  catch {
    applyInterfaceFont('dbx-default')
  }
}
