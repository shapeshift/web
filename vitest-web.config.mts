import { defineConfig, mergeConfig } from 'vitest/config'

import vitestConfig from './vitest.config.mts'

// eslint-disable-next-line import/no-default-export
export default defineConfig(configEnv =>
  mergeConfig(
    vitestConfig(configEnv),
    defineConfig({
      test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts', 'src/**/*test.tsx'],
        exclude: [
          // See vitest-side-effects.config.ts
          'src/lib/poll/poll.test.ts',
          'src/lib/cryptography/login.test.ts',
          // Temporarily skipped until https://github.com/shapeshift/hdwallet/pull/666 goes in
          'src/components/Modals/Send/hooks/useSendDetails/useSendDetails.test.tsx',
          'src/components/Modals/Send/hooks/useFormSend/useFormSend.test.tsx',
        ],
      },
    }),
  ),
)
