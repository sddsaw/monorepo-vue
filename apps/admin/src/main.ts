import { initSentry } from '@sa/utils'
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

  initSentry(app, router, {
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    environment: import.meta.env.MODE,
    release: BUILD_TIME,
    enableReplay: true,
  })

  setupAppVersionNotification()

  setupVueRootValidator(app, {
    lang: 'zh',
  })

  app.mount('#app')
}

setupApp()
