import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import antfu from '@antfu/eslint-config'

export interface ESLintConfigOptions {
  unocss?: boolean
  vue?: boolean
  ignores?: string[]
  stylistic?: {
    indent?: number | 'tab'
    quotes?: 'single' | 'double'
  }
  overrides?: TypedFlatConfigItem[]
}

/**
 * Create ESLint configuration
 * Based on @antfu/eslint-config, supporting flexible configuration overrides
 */
export function createESLintConfig(options: ESLintConfigOptions = {}): ReturnType<typeof antfu> {
  const {
    unocss = true,
    vue = true,
    ignores = [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.md',
      '**/elegant/*.ts',
    ],
    stylistic = {
      indent: 2,
      quotes: 'single',
    },
    overrides = [],
  } = options

  return antfu(
    {
      unocss,
      vue,
      ignores,
      stylistic,
    },
    {
      // Vue file rules
      files: ['**/*.vue'],
      rules: {
        'vue/max-attributes-per-line': ['error', {
          singleline: 6,
          multiline: {
            max: 1,
          },
        }],
      },
    },
    {
      // TypeScript file rules
      files: ['**/*.ts'],
      rules: {},
    },
    {
      // Global rule overrides
      rules: {
        'eslint-comments/no-unlimited-disable': 'off',
        'node/prefer-global/process': 'off',
        'no-console': 'warn',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/ban-ts-comment': [
          'warn',
          { 'ts-ignore': false },
        ],
        'pnpm/json-enforce-catalog': 'off',
        'pnpm/yaml-enforce-settings': 'off',
        'pnpm/yaml-no-unused-catalog-item': 'off',
        'import/consistent-type-specifier-style': 'off',
      },
    },
    ...overrides,
  )
}

export default createESLintConfig
