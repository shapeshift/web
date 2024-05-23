import type { ChainId } from '@shapeshiftoss/caip'
import type { SupportedChainIds } from 'lib/swapper/types'

import { arbitrumBridgeSupportedChainIds } from './types'

// Address used by 1inch for any native asset (ETH, AVAX, etc)
export const ONE_INCH_NATIVE_ASSET_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export const ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: arbitrumBridgeSupportedChainIds as unknown as ChainId[],
  buy: arbitrumBridgeSupportedChainIds as unknown as ChainId[],
}
