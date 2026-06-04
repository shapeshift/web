import path from 'node:path'
import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'web',
          environment: 'happy-dom',
          setupFiles: ['src/setupVitest'],
          clearMocks: true,
          include: ['src/**/*.test.ts', 'src/**/*test.tsx'],
          exclude: [
            // Temporarily skipped until https://github.com/shapeshift/hdwallet/pull/666 goes in
            'src/components/Modals/Send/hooks/useSendDetails/useSendDetails.test.tsx',
            'src/components/Modals/Send/hooks/useFormSend/useFormSend.test.tsx',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'packages',
          setupFiles: ['src/setupVitest'],
          clearMocks: true,
          include: ['packages/**/*.test.ts'],
          exclude: [
            '**/node_modules/**',
            'packages/hdwallet-*/**',
            'packages/public-api/src/integration.test.ts',
            // tested via its own localized config (swap-widget project)
            'packages/swap-widget/**',
          ],
        },
      },
      './packages/swap-widget/vitest.config.ts',
      {
        extends: true,
        resolve: {
          alias: {
            mswMock: path.resolve(__dirname, 'packages/hdwallet-native/__mocks__/mswMock.ts'),
            untouchableMock: path.resolve(
              __dirname,
              'packages/hdwallet-native/__mocks__/untouchableMock.ts',
            ),
            '@ton/ton': path.resolve(__dirname, 'packages/hdwallet-native/__mocks__/@ton/ton.js'),
          },
        },
        test: {
          name: 'hdwallet',
          globals: true,
          include: ['packages/hdwallet-*/src/**/*.test.ts'],
          exclude: ['packages/hdwallet-integration/**'],
          setupFiles: ['fake-indexeddb/auto'],
          testTimeout: 60_000,
          clearMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'hdwallet-integration',
          globals: true,
          include: ['packages/hdwallet-integration/src/**/*.test.ts'],
          testTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'public-api-integration',
          env: loadEnv('test', path.resolve(__dirname, 'packages/public-api'), ''),
          include: ['packages/public-api/src/integration.test.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
