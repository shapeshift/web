import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import {
  convertDecimalPercentageToBasisPoints,
  isFulfilled,
  isRejected,
  isResolvedErr,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  MultiHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getHopByIndex, makeSwapErrorRight } from '../../../utils'
import type { ThorTradeQuote } from '../types'
import { addL1ToLongtailPartsToMemo } from './addL1ToLongtailPartsToMemo'
import { getBestAggregator } from './getBestAggregator'
import { getL1Quote } from './getL1quote'
import type { AggregatorContract } from './longTailHelpers'
import { getTokenFromAsset, getWrappedToken, TradeType } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getL1ToLongtailQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerancePercentageDecimal,
  } = input

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

  /*
    We only support L1 -> ethereum longtail swaps for now.
  */
  if (buyAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${buyAsset.chainId}.`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAssetChainId: buyAsset.chainId },
      }),
    )
  }

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  const sellAssetFeeAssetId = deps.assertGetChainAdapter(sellAssetChainId).getFeeAssetId()
  const sellAssetFeeAsset = sellAssetFeeAssetId ? deps.assetsById[sellAssetFeeAssetId] : undefined

  const buyAssetFeeAssetId = deps.assertGetChainAdapter(buyAssetChainId).getFeeAssetId()
  const buyAssetFeeAsset = buyAssetFeeAssetId ? deps.assetsById[buyAssetFeeAssetId] : undefined

  if (!buyAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${buyAssetChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { buyAssetChainId },
      }),
    )
  }

  if (!sellAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellAssetChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId },
      }),
    )
  }

  const l1Tol1QuoteInput: CommonTradeQuoteInput = {
    ...input,
    buyAsset: buyAssetFeeAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  }

  const maybeThorchainQuotes = await getL1Quote(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.L1ToLongTail,
  )

  if (maybeThorchainQuotes.isErr()) return Err(maybeThorchainQuotes.unwrapErr())

  const thorchainQuotes = maybeThorchainQuotes.unwrap()

  let bestAggregator: AggregatorContract
  let quotedAmountOut: bigint

  const promises = await Promise.allSettled(
    thorchainQuotes.map(async quote => {
      // A quote always has a first step
      const onlyStep = getHopByIndex(quote, 0)!

      const maybeBestAggregator = await getBestAggregator(
        buyAssetFeeAsset,
        getWrappedToken(buyAssetFeeAsset),
        getTokenFromAsset(buyAsset),
        onlyStep.buyAmountAfterFeesCryptoBaseUnit,
      )

      if (maybeBestAggregator.isErr()) return Err(maybeBestAggregator.unwrapErr())

      const unwrappedResult = maybeBestAggregator.unwrap()

      bestAggregator = unwrappedResult.bestAggregator
      quotedAmountOut = unwrappedResult.quotedAmountOut

      const updatedMemo = addL1ToLongtailPartsToMemo({
        sellAssetChainId,
        aggregator: bestAggregator,
        finalAssetAssetId: buyAsset.assetId,
        finalAssetAmountOut: quotedAmountOut.toString(),
        slippageBps: convertDecimalPercentageToBasisPoints(
          slippageTolerancePercentageDecimal ??
            getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Thorchain),
        ).toString(),
        quotedMemo: quote.memo,
        longtailTokens,
      })

      return Ok({
        ...quote,
        memo: updatedMemo,
        aggregator: bestAggregator,
        steps: quote.steps.map(s => ({
          ...s,
          buyAsset,
          buyAmountAfterFeesCryptoBaseUnit: quotedAmountOut.toString(),
          // This is wrong, we should get the get the value before fees or display ETH value received after the thorchain bridge
          buyAmountBeforeFeesCryptoBaseUnit: quotedAmountOut.toString(),
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
        })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps,
        isLongtail: true,
        longtailData: {
          L1ToLongtailExpectedAmountOut: quotedAmountOut.toString(),
        },
      })
    }),
  )

  if (promises.every(promise => isRejected(promise) || isResolvedErr(promise))) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote] - failed to get best aggregator',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const updatedQuotes = promises.filter(isFulfilled).map(element => element.value.unwrap())

  return Ok(updatedQuotes)
}
