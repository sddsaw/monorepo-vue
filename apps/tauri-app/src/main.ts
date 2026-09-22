import { createApp } from 'vue'
import App from './App.vue'
import { setupIconifyOffline } from './plugins/iconify'
import { setupRouter } from './router'
import './styles/global.css'
import 'virtual:uno.css'

setupIconifyOffline()

const app = createApp(App)
setupRouter(app)
app.mount('#app')
