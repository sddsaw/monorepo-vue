import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    vue: true,
    ignores: [
      '**/*.md',
      '**/elegant/*.ts',
    ],
    stylistic: {
      indent: 2, // 4, or 'tab'
      quotes: 'single', // or 'double'
    },
  },
  {
    // 针对.vue后缀的文件进行格式化
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
    // 针对.ts后缀的文件进行格式化
    files: ['**/*.ts'],
    rules: {
    },
  },
  {
    rules: {
      'eslint-comments/no-unlimited-disable': 'off',
      // 或者完全禁用这条规则
      'node/prefer-global/process': 'off',
      'no-console': 'warn',
      // 关键是这个
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        { 'ts-ignore': false },
      ],

      // pnpm默认关闭
      'pnpm/json-enforce-catalog': 'off',
      'pnpm/yaml-enforce-settings': 'off',
      'pnpm/yaml-no-unused-catalog-item': 'off',
      // import type 关闭
      'import/consistent-type-specifier-style': 'off',
    },
  },
)
