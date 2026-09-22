import { createViteConfig } from '@internal/vite-config'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default createViteConfig({
  appName: 'tauri-app',
  platform: 'tauri',
  port: 9530,
  componentResolvers: [NaiveUiResolver()],
})
