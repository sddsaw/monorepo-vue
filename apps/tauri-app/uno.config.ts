import type { Preset } from 'unocss'
import { presetSoybeanAdmin } from '@sa/uno-preset'
import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'
import { uiControlSizeCss, uiFontSizeCss } from './src/theme/typography'
import { themeVars } from './src/theme/vars'

export default defineConfig({
  content: {
    pipeline: {
      exclude: ['node_modules', 'dist'],
    },
  },
  theme: {
    ...themeVars,
    fontFamily: {
      sans: 'var(--wb-interface-font, var(--wb-default-interface-font))',
    },
    fontSize: {
      'xs': [uiFontSizeCss(12), '1.5'],
      'sm': [uiFontSizeCss(14), '1.5'],
      'base': [uiFontSizeCss(16), '1.5'],
      'lg': [uiFontSizeCss(18), '1.5'],
      'xl': [uiFontSizeCss(20), '1.4'],
      '2xl': [uiFontSizeCss(24), '1.3'],
      '3xl': [uiFontSizeCss(30), '1.3'],
      'icon-xs': '0.875rem',
      'icon-small': '1rem',
      'icon': '1.125rem',
      'icon-large': '1.5rem',
      'icon-xl': '2rem',
    },
  },
  shortcuts: {
    'card-wrapper': 'rd-8px shadow-sm bg-white dark:bg-[#18181c]',
  },
  rules: [
    [/^text-ui-(\d+)$/, ([, size]) => ({ 'font-size': uiFontSizeCss(Number(size)) })],
    [/^h-ui-(\d+)$/, ([, size]) => ({ height: uiControlSizeCss(Number(size)) })],
    [/^min-h-ui-(\d+)$/, ([, size]) => ({ 'min-height': uiControlSizeCss(Number(size)) })],
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  presets: [presetWind3({ dark: 'class' }), presetSoybeanAdmin() as unknown as Preset],
})
