import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { ONE_INCH_NATIVE_ASSET_ADDRESS } from './constants'
import type { OneInchSupportedChainId } from './types'
import { oneInchSupportedChainIds } from './types'

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Result<boolean, SwapErrorRight> => {
  if (
    !oneInchSupportedChainIds.includes(sellAsset.chainId as OneInchSupportedChainId) ||
    !oneInchSupportedChainIds.includes(buyAsset.chainId as OneInchSupportedChainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[OneInch: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[OneInch: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}

export const getOneInchTokenAddress = (asset: Asset): string => {
  return isNativeEvmAsset(asset.assetId)
    ? ONE_INCH_NATIVE_ASSET_ADDRESS
    : fromAssetId(asset.assetId).assetReference
}
