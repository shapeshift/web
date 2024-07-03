import type { ChainId } from '@shapeshiftoss/caip'

import type { SupportedChainIds } from '../../../types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: arbitrumBridgeSupportedChainIds as unknown as ChainId[],
  buy: arbitrumBridgeSupportedChainIds as unknown as ChainId[],
}
