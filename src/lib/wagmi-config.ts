import { arbitrumChainId } from '@shapeshiftoss/caip'
import { createConfig } from 'wagmi'

import { assertGetViemClient } from './viem-client'

export const wagmiConfig = createConfig({
  publicClient: assertGetViemClient(arbitrumChainId),
})
