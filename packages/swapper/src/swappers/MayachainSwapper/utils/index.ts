import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { MAYACHAIN_SUPPORTED_CHAIN_IDS } from '../constants'
import { assetIdToMayaPoolAssetId } from './poolAssetHelpers/poolAssetHelpers'

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Result<boolean, SwapErrorRight> => {
  if (!MAYACHAIN_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported sell chain`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!MAYACHAIN_SUPPORTED_CHAIN_IDS.includes(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported buy chain`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  if (!assetIdToMayaPoolAssetId({ assetId: buyAsset.assetId })) {
    return Err(
      makeSwapErrorRight({
        message: `[MayachainSwapper: assertValidTrade] - unsupported buy asset`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { assetId: buyAsset.assetId },
      }),
    )
  }

  if (!assetIdToMayaPoolAssetId({ assetId: sellAsset.assetId })) {
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
