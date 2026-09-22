import { createESLintConfig } from '@internal/eslint-config'

export default createESLintConfig({
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '**/*.md',
    'src-tauri/**',
  ],
})
