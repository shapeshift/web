/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
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
})
