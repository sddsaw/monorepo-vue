import type { LazyStore } from '@tauri-apps/plugin-store'
import { isTauri } from '../../plugins/tauri'

const STORE_FILENAME = 'settings.json'

let storePromise: Promise<LazyStore> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function getTauriStore(): Promise<LazyStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const { LazyStore } = await import('@tauri-apps/plugin-store')
      return new LazyStore(STORE_FILENAME)
    })().catch((err) => {
      storePromise = null
      throw err
    })
  }
  return storePromise
}

function scheduleStoreSave(store: LazyStore): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    saveTimer = null
    void store.save()
  }, 120)
}

/**
 * 获取持久化存储的值
 * 在 Tauri 环境下从 settings.json 文件中读取，在 Web 环境下回退至 localStorage
 */
export async function getStoreValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  if (isTauri()) {
    const store = await getTauriStore()
    const val = await store.get(key)
    return (val !== null && val !== undefined) ? (val as T) : defaultValue
  }

  const raw = localStorage.getItem(`soybean_store_${key}`)
  if (raw === null)
    return defaultValue

  try {
    return JSON.parse(raw) as T
  }
  catch {
    return (raw as unknown as T) || defaultValue
  }
}

/**
 * 设置持久化存储的值
 * 在 Tauri 环境下写入 settings.json 并自动保存，在 Web 环境下写入 localStorage
 */
export async function setStoreValue<T>(key: string, value: T): Promise<void> {
  if (isTauri()) {
    const store = await getTauriStore()
    await store.set(key, value)
    scheduleStoreSave(store)
    return
  }

  localStorage.setItem(`soybean_store_${key}`, JSON.stringify(value))
}

/**
 * 删除持久化存储的值
 */
export async function deleteStoreValue(key: string): Promise<void> {
  if (isTauri()) {
    const store = await getTauriStore()
    await store.delete(key)
    scheduleStoreSave(store)
    return
  }

  localStorage.removeItem(`soybean_store_${key}`)
}
