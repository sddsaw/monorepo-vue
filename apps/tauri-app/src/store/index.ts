import type { App } from 'vue'
import { createPinia } from 'pinia'
import { resetSetupStore } from './plugins'

export const pinia = createPinia()
pinia.use(resetSetupStore)

/** Setup Vue store plugin pinia */
export function setupStore(app: App) {
  app.use(pinia)
}

export * from './modules/app'
export * from './modules/auth'
export * from './modules/route'
export * from './modules/tab'
export * from './modules/theme'
export * from './modules/tp'
export * from './modules/workbenchLayout'
export * from './modules/workbenchTheme'
