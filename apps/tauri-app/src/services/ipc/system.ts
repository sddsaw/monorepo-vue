import { isTauri } from '../../plugins/tauri'

export interface SystemInfo {
  os: string
  arch: string
  tauri_version: string
}

/**
 * 调用 Rust 问候指令
 */
export async function greet(name: string): Promise<string> {
  if (!isTauri()) {
    return `[Web 模拟] 你好，${name}！（浏览器环境）`
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('greet', { name })
}

/**
 * 调用 Rust 获取系统基础信息
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  if (!isTauri()) {
    return {
      os: 'web-browser',
      arch: navigator.userAgent.includes('Mac') ? 'arm64' : 'x86_64',
      tauri_version: '2.x-mock',
    }
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<SystemInfo>('get_system_info')
}
