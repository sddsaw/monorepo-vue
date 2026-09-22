import type { ViteEnv } from '../types.js'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'
import { presetIcons } from 'unocss'
import unocss from 'unocss/vite'

export function setupUnocss(viteEnv: ViteEnv) {
  const { VITE_ICON_PREFIX = 'icon', VITE_ICON_LOCAL_PREFIX = 'icon-local' } = viteEnv || {}

  const localIconPath = path.join(process.cwd(), 'src/assets/svg-icon')

  /** The name of the local icon collection */
  const collectionName = VITE_ICON_LOCAL_PREFIX ? VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, '') : 'local'

  const hasLocalIcons = fs.existsSync(localIconPath)

  return unocss({
    presets: [
      presetIcons({
        prefix: `${VITE_ICON_PREFIX}-`,
        scale: 1,
        extraProperties: {
          display: 'inline-block',
        },
        collections: hasLocalIcons
          ? {
              [collectionName]: FileSystemIconLoader(localIconPath, svg =>
                svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')) as any,
            }
          : undefined,
        warn: true,
      }),
    ],
  })
}
