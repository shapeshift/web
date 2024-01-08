/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// This is weird but it works, and it's the only way I've found to make these two tests for now.
// There is something related to environment isolation and side effects that is causing these tests to fail.
// They work when ran individually (i.e when re-running failed tests only) but not when ran as a suite with all other tests.
// So we make a separate config for these and run them as a separate suite.
// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
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
})
