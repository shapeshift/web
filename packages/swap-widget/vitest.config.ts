import { resolve } from 'path'
import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

// eslint-disable-next-line import/no-default-export
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'swap-widget',
      globals: true,
      environment: 'jsdom',
      root: resolve(__dirname),
      setupFiles: [],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
)
