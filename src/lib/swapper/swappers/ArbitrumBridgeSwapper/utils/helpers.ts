import { makeSwapErrorRight, type SwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'

import type { ArbitrumBridgeSupportedChainId } from './types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Result<boolean, SwapErrorRight> => {
  if (
    !arbitrumBridgeSupportedChainIds.includes(
      sellAsset.chainId as ArbitrumBridgeSupportedChainId,
    ) ||
    !arbitrumBridgeSupportedChainIds.includes(buyAsset.chainId as ArbitrumBridgeSupportedChainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (buyAsset.chainId === sellAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - both assets must be on different chainIds`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}
