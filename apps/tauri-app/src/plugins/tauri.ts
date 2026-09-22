/**
 * 检查当前运行环境是否在 Tauri 客户端内
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
