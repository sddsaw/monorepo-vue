import type { OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import { isTauri } from '../../plugins/tauri'

export async function openFileDialog(options: OpenDialogOptions = {}): Promise<string | string[] | null> {
  if (!isTauri())
    return null

  const { open } = await import('@tauri-apps/plugin-dialog')
  return open(options)
}

export async function confirmDialog(message: string, options?: Parameters<typeof import('@tauri-apps/plugin-dialog')['ask']>[1]): Promise<boolean> {
  if (!isTauri())
    return false

  const { ask } = await import('@tauri-apps/plugin-dialog')
  return ask(message, options)
}
