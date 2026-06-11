import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import progress from 'vite-plugin-progress'
import vueRootValidator from 'vite-plugin-vue-transition-root-validator'
import { setupDevtoolsPlugin } from './devtools'
import { setupHtmlPlugin } from './html'
import { setupElegantRouter } from './router'
import { setupUnocss } from './unocss'
import { setupUnplugin } from './unplugin'

export function setupVitePlugins(viteEnv: Env.ImportMeta, buildTime: string) {
  const plugins: PluginOption = [
    vue(),
    vueJsx(),
    setupDevtoolsPlugin(viteEnv),
    setupElegantRouter(),
    setupUnocss(viteEnv),
    ...setupUnplugin(viteEnv),
    progress(),
    setupHtmlPlugin(buildTime),
    vueRootValidator(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: '../../dist/visualizer/teacher.html',
    }) as PluginOption,
  ]

  return plugins
}
