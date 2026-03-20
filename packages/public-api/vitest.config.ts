import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: ['src/**/*.test.ts', 'src/integration.test.ts'],
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
