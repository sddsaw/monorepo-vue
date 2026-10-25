/**
 * ATE 可视化工作台主题 Token 与预设主题字典
 */

export interface WorkbenchThemeTokens {
  id: string
  name: string
  isDark: boolean
  // 6 大核心窗格底色
  titleBarBg: string // 顶部标题栏背景
  activityBarBg: string // 左侧 48px 图标栏背景
  sidebarBg: string // 左侧测试树背景
  editorBg: string // 主编辑区背景
  bottomPanelBg: string // 底部日志面板背景
  statusBarBg: string // 底部状态栏背景
  // 边框、文字与主高亮
  accentColor: string // 活动窗格高亮与主按钮色
  borderColor: string // 分割线与窗格边界色
  textColor: string // 基础正文字体颜色
  textSecondaryColor: string // 次级文字颜色
}

export const PRESET_WORKBENCH_THEMES: Record<string, WorkbenchThemeTokens> = {
  'vscode-dark': {
    id: 'vscode-dark',
    name: 'VS Code Dark (暗黑)',
    isDark: true,
    titleBarBg: '#2d2d2d',
    activityBarBg: '#181818',
    sidebarBg: '#252526',
    editorBg: '#1e1e1e',
    bottomPanelBg: '#1e1e1e',
    statusBarBg: '#007acc',
    accentColor: '#007acc',
    borderColor: '#2b2b2b',
    textColor: '#cccccc',
    textSecondaryColor: '#8c8c8c',
  },
  'vscode-light': {
    id: 'vscode-light',
    name: 'VS Code Light (明亮)',
    isDark: false,
    titleBarBg: '#f3f3f3',
    activityBarBg: '#2c2c2c',
    sidebarBg: '#f3f3f3',
    editorBg: '#ffffff',
    bottomPanelBg: '#f3f3f3',
    statusBarBg: '#007acc',
    accentColor: '#007acc',
    borderColor: '#e7e7e7',
    textColor: '#333333',
    textSecondaryColor: '#666666',
  },
  'one-dark-pro': {
    id: 'one-dark-pro',
    name: 'One Dark Pro (护眼暗灰)',
    isDark: true,
    titleBarBg: '#21252b',
    activityBarBg: '#282c34',
    sidebarBg: '#21252b',
    editorBg: '#282c34',
    bottomPanelBg: '#21252b',
    statusBarBg: '#61afef',
    accentColor: '#61afef',
    borderColor: '#181a1f',
    textColor: '#abb2bf',
    textSecondaryColor: '#5c6370',
  },
  'industrial-blue': {
    id: 'industrial-blue',
    name: 'Industrial Blue (工业工控蓝)',
    isDark: true,
    titleBarBg: '#161b22',
    activityBarBg: '#0d1117',
    sidebarBg: '#161b22',
    editorBg: '#0d1117',
    bottomPanelBg: '#161b22',
    statusBarBg: '#1f6feb',
    accentColor: '#58a6ff',
    borderColor: '#30363d',
    textColor: '#c9d1d9',
    textSecondaryColor: '#8b949e',
  },
}

/**
 * 自动解析 VS Code 官方主题 JSON 映射为工作台 Tokens
 */
export function parseVsCodeTheme(json: Record<string, any>): WorkbenchThemeTokens {
  const colors = json?.colors || {}
  const isLight = json?.type === 'light'

  return {
    id: `custom-${Date.now()}`,
    name: json?.name || 'Custom Imported Theme',
    isDark: !isLight,
    titleBarBg: colors['titleBar.activeBackground'] || (isLight ? '#f3f3f3' : '#2d2d2d'),
    activityBarBg: colors['activityBar.background'] || (isLight ? '#2c2c2c' : '#333333'),
    sidebarBg: colors['sideBar.background'] || (isLight ? '#f3f3f3' : '#252526'),
    editorBg: colors['editor.background'] || (isLight ? '#ffffff' : '#1e1e1e'),
    bottomPanelBg: colors['panel.background'] || (isLight ? '#f3f3f3' : '#1e1e1e'),
    statusBarBg: colors['statusBar.background'] || '#007acc',
    accentColor: colors.focusBorder || colors['activityBarBadge.background'] || '#007acc',
    borderColor: colors['sideBar.border'] || colors['panel.border'] || (isLight ? '#e7e7e7' : '#3e3e42'),
    textColor: colors.foreground || (isLight ? '#333333' : '#cccccc'),
    textSecondaryColor: colors.descriptionForeground || (isLight ? '#666666' : '#8c8c8c'),
  }
}
