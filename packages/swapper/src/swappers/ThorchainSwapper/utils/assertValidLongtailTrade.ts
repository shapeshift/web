import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { Asset, EvmChainId } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'

// We only support ethereum longtail -> L1 swaps for now.
// We can later add BSC via UniV3, or Avalanche (e.g. via PancakeSwap)
export const assertValidLongtailToL1Trade = ({
  sellAsset,
  deps,
}: {
  sellAsset: Asset
  deps: SwapperDeps
}): Result<{ buyAssetFeeAsset: Asset }, SwapErrorRight> => {
  if (sellAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${sellAsset.chainId}.`,
        code: TradeQuoteError.UnsupportedChain,
        details: { sellAssetChainId: sellAsset.chainId },
      }),
    )
  }

  const buyAssetFeeAssetId = deps.assertGetChainAdapter(sellAsset.chainId)?.getFeeAssetId()
  const buyAssetFeeAsset = buyAssetFeeAssetId ? deps.assetsById[buyAssetFeeAssetId] : undefined

  if (!buyAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellAsset.chainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId: sellAsset.chainId },
      }),
    )
  }

  // TODO: use more than just UniswapV3, and also consider trianglar routes.
  if (viemClientByChainId[sellAsset.chainId as EvmChainId] === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `no public client found for chainId '${sellAsset.chainId}'`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  return Ok({ buyAssetFeeAsset })
}

// We only support L1 -> ethereum longtail swaps for now.
export const assertValidL1ToLongtailTrade = async ({
  sellAsset,
  buyAsset,
  deps,
}: {
  sellAsset: Asset
  buyAsset: Asset
  deps: SwapperDeps
}): Promise<Result<{ buyAssetFeeAsset: Asset; longtailTokens: AssetId[] }, SwapErrorRight>> => {
  const longtailTokensJson = await import('../generated/generatedThorLongtailTokens.json')
  const longtailTokens: AssetId[] = longtailTokensJson.default

  if (!longtailTokens.includes(buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported buyAssetId ${buyAsset.assetId}.`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (buyAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${buyAsset.chainId}.`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAssetChainId: buyAsset.chainId },
      }),
    )
  }

  const sellAssetFeeAssetId = deps.assertGetChainAdapter(sellAsset.chainId).getFeeAssetId()
  const sellAssetFeeAsset = sellAssetFeeAssetId ? deps.assetsById[sellAssetFeeAssetId] : undefined

  const buyAssetFeeAssetId = deps.assertGetChainAdapter(buyAsset.chainId).getFeeAssetId()
  const buyAssetFeeAsset = buyAssetFeeAssetId ? deps.assetsById[buyAssetFeeAssetId] : undefined

  if (!buyAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${buyAsset.chainId}.`,
        code: TradeQuoteError.InternalError,
        details: { buyAssetChainId: buyAsset.chainId },
      }),
    )
  }

  if (!sellAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellAsset.chainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId: sellAsset.chainId },
      }),
    )
  }

  return Ok({ buyAssetFeeAsset, longtailTokens })
}
