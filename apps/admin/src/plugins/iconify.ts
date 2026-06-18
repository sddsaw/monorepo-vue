import { addAPIProvider, addCollection } from '@iconify/vue'
import localIcons from './local-icons.json'

/** Setup the iconify offline */
export function setupIconifyOffline() {
  (localIcons as any[]).forEach((collection) => {
    addCollection(collection)
  })

  const { VITE_ICONIFY_URL } = import.meta.env

  if (VITE_ICONIFY_URL) {
    addAPIProvider('', { resources: [VITE_ICONIFY_URL] })
  }
}
