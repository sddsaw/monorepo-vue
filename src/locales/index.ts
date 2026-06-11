import type { App, Ref } from 'vue'
import { createI18n } from 'vue-i18n'
import { localStg } from '@/utils/storage'
import messages from './locale'

interface LocaleMessage {
  [key: string]: string | LocaleMessage | LocaleMessage[]
}

const i18n = createI18n({
  locale: localStg.get('lang') || 'zh-CN',
  fallbackLocale: 'en',
  messages: messages as unknown as Record<App.I18n.LangType, LocaleMessage>,
  legacy: false,
})

/**
 * Setup plugin i18n
 *
 * @param app
 */
export function setupI18n(app: App) {
  app.use(i18n)
}

export const $t = i18n.global.t as App.I18n.$T

export function setLocale(locale: App.I18n.LangType) {
  (i18n.global.locale as unknown as Ref<App.I18n.LangType>).value = locale

  document?.querySelector('html')?.setAttribute('lang', locale)
}

export function getLocale(): App.I18n.LangType {
  return (i18n.global.locale as unknown as Ref<App.I18n.LangType>).value
}
