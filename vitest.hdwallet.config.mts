import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      mswMock: path.resolve(__dirname, 'packages/hdwallet-native/__mocks__/mswMock.ts'),
      untouchableMock: path.resolve(__dirname, 'packages/hdwallet-native/__mocks__/untouchableMock.ts'),
      '@ton/ton': path.resolve(__dirname, 'packages/hdwallet-native/__mocks__/@ton/ton.js'),
    },
  },
  test: {
    globals: true,
    include: ['packages/hdwallet-*/src/**/*.test.ts'],
    exclude: ['packages/hdwallet-integration/**'],
    setupFiles: ['fake-indexeddb/auto'],
    testTimeout: 60_000,
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
})
