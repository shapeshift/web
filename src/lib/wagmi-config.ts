import { arbitrumChainId } from '@shapeshiftoss/caip'
import { createConfig } from 'wagmi'

import { assertGetViemClient } from './viem-client'

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

export const wagmiConfig = createConfig({
  publicClient: assertGetViemClient(arbitrumChainId),
})
