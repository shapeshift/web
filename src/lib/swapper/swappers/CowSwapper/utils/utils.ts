import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { CowChainId } from '../types'

export const isCowswapSupportedChainId = (
  chainId: ChainId,
  supportedChains: CowChainId[],
): chainId is CowChainId => {
  return (
    // We're double checking here, because the latter check is ought to be removed once the feature flag is no longer needed
    (chainId === KnownChainIds.EthereumMainnet || chainId === KnownChainIds.GnosisMainnet) &&
    supportedChains.includes(chainId as CowChainId)
  )
}
