import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { SUNIO_SUPPORTED_CHAIN_IDS, SUNIO_TRON_NATIVE_ADDRESS } from './constants'

export const isSupportedChainId = (chainId: string): boolean => {
  return SUNIO_SUPPORTED_CHAIN_IDS.includes(chainId as any)
}

export const assetIdToTronToken = (assetId: AssetId): string => {
  if (isToken(assetId)) {
    const { assetReference } = fromAssetId(assetId)
    return assetReference
  }
  return SUNIO_TRON_NATIVE_ADDRESS
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<void, SwapErrorRight> => {
  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[${SwapperName.Sunio}] Unsupported chainId: ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[${SwapperName.Sunio}] Cross-chain not supported`,
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  if (sellAsset.chainId !== tronChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[${SwapperName.Sunio}] Only TRON chain supported`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok(undefined)
}
