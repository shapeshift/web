/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'

import { determineMode } from './utils'

// eslint-disable-next-line import/no-default-export
export default defineConfig(async () => {
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default
  const actualMode = determineMode()

  const env = {
    ...loadEnv('base', process.cwd(), ''),
    ...loadEnv(actualMode, process.cwd(), ''),
  }

  return {
    plugins: [tsconfigPaths()],
    define: {
      ...Object.fromEntries(
        Object.entries(env).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
    },
    test: {
      include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx'],
      environment: 'happy-dom',
      setupFiles: ['dotenv/config', 'src/setupVitest'],
      clearMocks: true,
      poolOptions: {
        isolate: false,
        threads: {
          singleThread: true,
        },
        forks: {
          isolate: false,
        },
      },
    },
  }
})
