import { setupVueRootValidator } from 'vite-plugin-vue-transition-root-validator/client'
import { createApp } from 'vue'
import App from './App.vue'
import { getLocale, setupI18n } from './locales'
import { setupAppVersionNotification, setupDayjs, setupIconifyOffline, setupLoading, setupNProgress } from './plugins'
import { setupRouter } from './router'
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

  setupI18n(app)

  setupAppVersionNotification()

  setupVueRootValidator(app, {
    lang: getLocale() === 'zh-CN' ? 'zh' : 'en',
  })

  app.mount('#app')
}

setupApp()
