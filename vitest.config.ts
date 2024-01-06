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
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'react-app-rewired/**/*.test.ts',
      'react-app-rewired/**/*.test.tsx',
    ],
    environment: 'happy-dom',
    setupFiles: ['dotenv/config', 'src/setupVitest'],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
