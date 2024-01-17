/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'react-app-rewired/**/*.test.ts',
      'react-app-rewired/**/*.test.tsx',
    ],
    // See vitest-side-effects.config.ts
    exclude: [
      'src/lib/poll/poll.test.ts',
      'src/lib/cryptography/login.test.ts',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
    ],
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
