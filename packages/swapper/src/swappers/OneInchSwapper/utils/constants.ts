import type { ChainId } from '@shapeshiftoss/caip'

import type { SupportedChainIds } from '../../../types'
import { oneInchSupportedChainIds } from './types'

// Address used by 1inch for any native asset (ETH, AVAX, etc)
export const ONE_INCH_NATIVE_ASSET_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export const ONE_INCH_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: oneInchSupportedChainIds as unknown as ChainId[],
  buy: oneInchSupportedChainIds as unknown as ChainId[],
}
