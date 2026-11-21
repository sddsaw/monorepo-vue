import { $t } from '@/locales'
import { useTpStore } from '@/store/modules/tp'

/** Shared by the visible toolbar button and the Tools menu. */
export function openIframeDemo() {
  useTpStore().openIframeTab({
    id: 'demo',
    title: $t('workbench.menu.iframeDemo'),
    src: `${import.meta.env.BASE_URL}iframe-demo/index.html`,
  })
}
