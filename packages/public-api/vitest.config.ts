import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    env: loadEnv(mode, process.cwd(), ''),
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/integration.test.ts'],
        },
      },
      {
        extends: true,
        testTimeout: 30000,
        test: {
          name: 'integration',
          include: ['src/integration.test.ts'],
        },
      },
    ],
  },
}))
