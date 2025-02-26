/// <reference types="vitest" />
import { defineConfig } from 'vite'

// eslint-disable-next-line import/no-default-export
export default defineConfig(async () => {
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default

  return {
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
  }
})
