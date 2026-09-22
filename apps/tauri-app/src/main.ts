import { createApp } from 'vue'
import App from './App.vue'
import {
  setupAppVersionNotification,
  setupDayjs,
  setupDeepLink,
  setupGlobalShortcuts,
  setupIconifyOffline,
  setupLoading,
  setupNProgress,
} from './plugins'
import { router, setupRouter } from './router'
import { setupStore } from './store'
import './plugins/assets'

async function setupApp() {
  setupLoading()
  setupNProgress()
  setupIconifyOffline()
  setupDayjs()

  const app = createApp(App)
  setupStore(app)
  await setupRouter(app)
  setupAppVersionNotification()
  app.mount('#app')

  // 初始化桌面特性（全局快捷键与 Deep Link）
  setupGlobalShortcuts()
  setupDeepLink(router)
}

setupApp()
