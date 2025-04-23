import { defineConfig, mergeConfig } from 'vitest/config'

import vitestConfig from './vitest.config.mts'

// eslint-disable-next-line import/no-default-export
export default defineConfig(configEnv =>
  mergeConfig(
    vitestConfig(configEnv),
    defineConfig({
      test: {
        include: ['packages/**/*.test.ts'],
      },
    }),
  ),
)
