import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales'
import {
  setupAppVersionNotification,
  setupDayjs,
  setupDeepLink,
  setupGlobalShortcuts,
  setupIconifyOffline,
  setupLoading,
  setupNProgress,
  setupRedisDevtools,
} from './plugins'
import { isMainWindow } from './plugins/tauri'
import { router, setupRouter } from './router'
import { setupStore } from './store'
import { restoreInterfaceFont } from './theme/interface-font'
import { localStg } from './utils/storage'
import './plugins/assets'

async function setupApp() {
  restoreInterfaceFont()
  setupLoading()
  setupNProgress()
  setupIconifyOffline()
  setupDayjs()

  const app = createApp(App)
  setupStore(app)
  setupI18n(app, localStg.get('lang') || 'zh-CN')
  await setupRouter(app)
  app.mount('#app')

  // 仅在主窗口初始化全局单例服务（避免 sub-window 等子窗口重复注册协议监听、全局热键与版本轮询）
  if (await isMainWindow()) {
    setupAppVersionNotification()
    setupGlobalShortcuts()
    setupDeepLink(router)
    setupRedisDevtools()
  }
}

setupApp()
