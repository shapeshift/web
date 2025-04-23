import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export
export default defineConfig(() => {
  return {
    plugins: [tsconfigPaths()],
    test: {
      setupFiles: ['src/setupVitest'],
      clearMocks: true,
      poolOptions: {
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
