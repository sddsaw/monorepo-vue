import { $t } from '@/locales'

/**
 * Translate options
 *
 * @param options
 */
export function translateOptions(options: CommonType.Option<string, App.I18n.I18nKey>[]) {
  return options.map(option => ({
    ...option,
    label: $t(option.label),
  }))
}
