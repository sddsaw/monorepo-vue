import type { PluginOption } from 'vite'
import type { CreateViteConfigOptions, ViteEnv } from './types.js'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'
import progress from 'vite-plugin-progress'
import vueRootValidator from 'vite-plugin-vue-transition-root-validator'
import {
  setupDevtoolsPlugin,
  setupElegantRouter,
  setupHtmlPlugin,
  setupUnocss,
  setupUnplugin,
} from './plugins/index.js'

export function setupVitePlugins(
  viteEnv: ViteEnv,
  buildTime: string,
  root: string,
  options?: CreateViteConfigOptions,
  isBuild?: boolean,
) {
  const plugins: PluginOption[] = [
    vue(),
    vueJsx(),
    setupDevtoolsPlugin(viteEnv),
    setupElegantRouter(options?.routerOptions),
    setupUnocss(viteEnv),
    ...setupUnplugin(viteEnv, root, options?.componentResolvers),
    progress(),
    setupHtmlPlugin(buildTime),
    vueRootValidator(),
  ]

  if (viteEnv.VITE_VISUALIZER === 'Y') {
    plugins.push(
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: `../../dist/visualizer/${options?.appName || 'app'}.html`,
      }) as PluginOption,
    )
  }

  if (isBuild) {
    plugins.push(
      compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240,
      }),
    )
  }

  return plugins
}
