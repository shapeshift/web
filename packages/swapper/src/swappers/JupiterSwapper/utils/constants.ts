import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds } from '../../../types'

export const jupiterSupportedChainIds = [KnownChainIds.SolanaMainnet] as ChainId[]

export const JUPITER_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: jupiterSupportedChainIds,
  buy: jupiterSupportedChainIds,
}
