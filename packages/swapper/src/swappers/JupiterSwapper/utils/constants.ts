import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds } from '../../../types'

export const jupiterSupportedChainIds = [KnownChainIds.SolanaMainnet] as const

export const JUPITER_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: jupiterSupportedChainIds as unknown as ChainId[],
  buy: jupiterSupportedChainIds as unknown as ChainId[],
}
