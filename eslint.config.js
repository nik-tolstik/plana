//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import prettierConfig from 'eslint-config-prettier'

export default [
  {
    ignores: [
      '.tanstack/**',
      'dist/**',
      'eslint.config.js',
      'node_modules/**',
      'playwright-report/**',
      'prettier.config.js',
      'src/routeTree.gen.ts',
      'storybook-static/**',
      'test-results/**',
    ],
  },
  ...tanstackConfig,
  prettierConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
]
