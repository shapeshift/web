import { resolve } from 'path'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    root: resolve(__dirname),
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}))
