import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: ['src/**/*.test.ts'],
    exclude: ['src/integration.test.ts', '**/node_modules/**'],
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
