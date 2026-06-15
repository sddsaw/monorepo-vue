import type { PluginOption } from 'vite'
import type { ViteEnv } from '../types.js'
import fs from 'node:fs'
import path from 'node:path'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

function createSharedComponentsResolver(root: string) {
  let sharedComponents: string[] | null = null

  return (componentName: string) => {
    if (!sharedComponents) {
      sharedComponents = []
      try {
        const packageIndexPath = path.resolve(root, '../../packages/components/src/index.ts')
        if (fs.existsSync(packageIndexPath)) {
          const content = fs.readFileSync(packageIndexPath, 'utf-8')
          const match = content.match(/export\s*\{([^}]+)\}/)
          if (match) {
            sharedComponents = match[1]
              .split(',')
              .map(name => name.trim())
              .filter(Boolean)
          }
        }
      }
      catch (e) {
        console.error('[ViteConfig] Failed to dynamically load shared components, fallback to default list', e)
        // Fallback fallback list
        sharedComponents = [
          'BetterScroll',
          'ButtonIcon',
          'CountTo',
          'LookForward',
          'SoybeanAvatar',
          'SvgIcon',
          'WaveBg',
          'SaButton',
          'TableColumnSetting',
          'TableHeaderOperation',
          'AppProvider',
          'DarkModeContainer',
          'ExceptionBase',
          'FullScreen',
          'IconTooltip',
          'LangSwitch',
          'MenuToggler',
          'PinToggler',
          'ReloadButton',
          'SystemLogo',
          'ThemeSchemaSwitch',
        ]
      }
    }

    if (sharedComponents.includes(componentName)) {
      return { name: componentName, from: '@sa/components' }
    }
  }
}

export function setupUnplugin(viteEnv: ViteEnv, root: string, extraResolvers: any[] = []) {
  const { VITE_ICON_PREFIX, VITE_ICON_LOCAL_PREFIX } = viteEnv

  const localIconPath = path.join(root, 'src/assets/svg-icon')

  /** The name of the local icon collection */
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, '')

  const plugins: PluginOption[] = [
    Icons({
      compiler: 'vue3',
      customCollections: {
        [collectionName]: FileSystemIconLoader(localIconPath, svg =>
          svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')),
      },
      scale: 1,
      defaultClass: 'inline-block',
    }),
    Components({
      dts: 'src/typings/components.d.ts',
      types: [{ from: 'vue-router', names: ['RouterLink', 'RouterView'] }],
      resolvers: [
        NaiveUiResolver(),
        IconsResolver({ customCollections: [collectionName], componentPrefix: VITE_ICON_PREFIX }),
        createSharedComponentsResolver(root),
        ...extraResolvers,
      ],
    }),
    createSvgIconsPlugin({
      iconDirs: [localIconPath],
      symbolId: `${VITE_ICON_LOCAL_PREFIX}-[dir]-[name]`,
      inject: 'body-last',
      customDomId: '__SVG_ICON_LOCAL__',
    }),
  ]

  return plugins
}
