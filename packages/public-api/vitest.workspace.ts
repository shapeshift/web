import { loadEnv } from 'vite'
import { defineWorkspace } from 'vitest/config'

const env = loadEnv('test', process.cwd(), '')

// eslint-disable-next-line import/no-default-export
export default defineWorkspace([
  {
    test: {
      globals: true,
      name: 'unit',
      include: ['src/**/*.test.ts'],
      exclude: ['src/integration.test.ts', '**/node_modules/**'],
    },
  },
  {
    test: {
      env,
      testTimeout: 30000,
      name: 'integration',
      include: ['src/integration.test.ts'],
    },
  },
])
