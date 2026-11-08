import type { Component, VNodeChild } from 'vue'

export type IconType = string | Component | (() => VNodeChild)

/**
 * 窗口标题栏下拉菜单项配置
 */
export interface WindowTitleBarMenuItem {
  /** 菜单项唯一标识 */
  key: string | number
  /** 菜单项显示文字 */
  label: string
  /** 图标：支持 Iconify 字符串 (例如 'ri:folder-open-line') 或 Vue 组件 / 渲染函数 */
  icon?: IconType
  /** 快捷键提示（例如 'Ctrl+O'、'⌘S'），自动在右侧浅色对齐呈现 */
  shortcut?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否在此项前展示分割线 */
  divided?: boolean
  /** 类型（支持 Naive UI 的 'divider' | 'group' 等） */
  type?: 'render' | 'group' | 'divider'
  /** 级联子菜单列表 */
  children?: WindowTitleBarMenuItem[]
  /** 兼容 options 别名 */
  options?: WindowTitleBarMenuItem[]
  /** 点击菜单项时的触发事件回调 */
  onSelect?: (item: WindowTitleBarMenuItem) => void | Promise<void>
  /** 额外扩展数据 */
  [key: string]: any
}

/**
 * 窗口标题栏顶层菜单配置
 */
export interface WindowTitleBarMenu {
  /** 顶层菜单唯一标识 (例如 'file', 'edit') */
  key: string | number
  /** 顶层菜单显示文字 (例如 'File', 'Edit') */
  label: string
  /** 顶层菜单图标 (可选) */
  icon?: IconType
  /** 是否禁用 */
  disabled?: boolean
  /** 下拉子菜单列表 */
  children?: WindowTitleBarMenuItem[]
  /** 兼容 options 别名 */
  options?: WindowTitleBarMenuItem[]
  /** 点击事件回调 */
  onSelect?: (item: WindowTitleBarMenuItem) => void | Promise<void>
  /** 额外扩展数据 */
  [key: string]: any
}

/**
 * 第二行快捷工具栏项配置
 */
export interface ToolbarItem {
  key: string
  icon: string
  tooltip: string
  class?: string
  onClick?: () => void
}

/**
 * 第二行快捷工具栏分组配置
 */
export interface ToolbarGroup {
  key: string
  /** 是否采用胶囊微卡片包裹高亮 */
  isCluster?: boolean
  items: ToolbarItem[]
}
