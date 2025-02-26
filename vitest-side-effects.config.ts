/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'

import { determineMode } from './utils'

// This is weird but it works, and it's the only way I've found to make these two tests for now.
// There is something related to environment isolation and side effects that is causing these tests to fail.
// They work when ran individually (i.e when re-running failed tests only) but not when ran as a suite with all other tests.
// So we make a separate config for these and run them as a separate suite.
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
      include: ['src/lib/poll/poll.test.ts', 'src/lib/cryptography/login.test.ts'],
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
