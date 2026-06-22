import { initSentry, initUmami } from '@sa/utils'
import { setupVueRootValidator } from 'vite-plugin-vue-transition-root-validator/client'
import { createApp } from 'vue'
import App from './App.vue'
import { setupAppVersionNotification, setupDayjs, setupIconifyOffline, setupLoading, setupNProgress } from './plugins'
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

  // A. 优化 Umami：仅在生产环境动态加载统计脚本
  initUmami({
    websiteId: import.meta.env.VITE_UMAMI_WEBSITE_ID || '',
    scriptUrl: import.meta.env.VITE_UMAMI_SCRIPT_URL,
  })

  // B. 优化 Sentry：生产环境启用录屏，本地开发调低/关闭性能采样与录屏
  initSentry(app, router, {
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    environment: import.meta.env.MODE,
    release: BUILD_TIME,
    enableReplay: import.meta.env.PROD,
    sentryConfig: {
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 0.0,
    },
  })

  setupAppVersionNotification()

  setupVueRootValidator(app, {
    lang: 'zh',
  })

  app.mount('#app')
}

setupApp()
