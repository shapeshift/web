/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

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
    setupFiles: ['dotenv/config'],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
