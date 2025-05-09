import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight } from 'packages/swapper/src/types'
import { TradeQuoteError } from 'packages/swapper/src/types'
import { makeSwapErrorRight } from 'packages/swapper/src/utils'

import { MAYACHAIN_SUPPORTED_CHAIN_IDS } from '../constants'
import { assetIdToPoolAssetId } from './poolAssetHelpers/poolAssetHelpers'

export * from './poolAssetHelpers/poolAssetHelpers'

export const isCacao = (assetId: AssetId) => assetId === mayachainAssetId

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Result<boolean, SwapErrorRight> => {
  if (!MAYACHAIN_SUPPORTED_CHAIN_IDS.sell.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported sell chain`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!MAYACHAIN_SUPPORTED_CHAIN_IDS.buy.includes(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported buy chain`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  if (!assetIdToPoolAssetId({ assetId: buyAsset.assetId })) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported buy asset`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { assetId: buyAsset.assetId },
      }),
    )
  }

  if (!assetIdToPoolAssetId({ assetId: sellAsset.assetId })) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported sell asset`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { assetId: sellAsset.assetId },
      }),
    )
  }

  return Ok(true)
}
