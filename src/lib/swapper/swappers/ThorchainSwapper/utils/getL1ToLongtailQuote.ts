import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, MultiHopTradeQuoteSteps } from '@shapeshiftoss/swapper'
import {
  makeSwapErrorRight,
  type SwapErrorRight,
  SwapperName,
  TradeQuoteError,
} from '@shapeshiftoss/swapper'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import type { Address } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import { isFulfilled, isRejected, isResolvedErr } from 'lib/utils'
import { convertDecimalPercentageToBasisPoints } from 'state/slices/tradeQuoteSlice/utils'

import { ALLOWANCE_CONTRACT } from '../constants'
import type { ThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { addAggregatorAndDestinationToMemo } from './addAggregatorAndDestinationToMemo'
import { getBestAggregator } from './getBestAggregator'
import { getL1quote } from './getL1quote'
import type { AggregatorContract } from './longTailHelpers'
import { getTokenFromAsset, getWrappedToken, TradeType } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getL1ToLongtailQuote = async (
  input: GetTradeQuoteInput,
  streamingInterval: number,
  assetsById: AssetsByIdPartial,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerancePercentageDecimal,
  } = input

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

  const chainAdapterManager = getChainAdapterManager()
  const sellChainId = sellAsset.chainId
  const buyChainId = buyAsset.chainId

  const nativeSellAssetId = chainAdapterManager.get(sellChainId)?.getFeeAssetId()
  const nativeSellAsset = nativeSellAssetId ? assetsById[nativeSellAssetId] : undefined

  const nativeBuyAssetId = chainAdapterManager.get(buyChainId)?.getFeeAssetId()
  const nativeBuyAsset = nativeBuyAssetId ? assetsById[nativeBuyAssetId] : undefined

  if (!nativeBuyAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${buyChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { buyAssetChainId: buyChainId },
      }),
    )
  }

  if (!nativeSellAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId: sellChainId },
      }),
    )
  }

  // TODO: use more than just UniswapV3, and also consider trianglar routes.
  const l1Tol1QuoteInput: GetTradeQuoteInput = {
    ...input,
    buyAsset: nativeBuyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  }

  const maybeThorchainQuotes = await getL1quote(
    l1Tol1QuoteInput,
    streamingInterval,
    TradeType.L1ToLongTail,
  )

  if (maybeThorchainQuotes.isErr()) return Err(maybeThorchainQuotes.unwrapErr())

  const thorchainQuotes = maybeThorchainQuotes.unwrap()

  let bestAggregator: AggregatorContract
  let quotedAmountOut: bigint

  const promises = await Promise.allSettled(
    thorchainQuotes.map(async quote => {
      const onlyStep = quote.steps[0]

      const maybeBestAggregator = await getBestAggregator(
        nativeBuyAsset,
        getWrappedToken(nativeBuyAsset),
        getTokenFromAsset(buyAsset),
        onlyStep.buyAmountAfterFeesCryptoBaseUnit,
      )

      if (maybeBestAggregator.isErr()) return Err(maybeBestAggregator.unwrapErr())

      const unwrappedResult = maybeBestAggregator.unwrap()

      bestAggregator = unwrappedResult.bestAggregator
      quotedAmountOut = unwrappedResult.quotedAmountOut

      const updatedMemo = addAggregatorAndDestinationToMemo({
        aggregator: bestAggregator,
        finalAssetAddress: fromAssetId(buyAsset.assetId).assetReference as Address,
        minAmountOut: convertDecimalPercentageToBasisPoints(
          slippageTolerancePercentageDecimal ??
            getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Thorchain),
        ).toString(),
        quotedMemo: quote.memo,
      })

      const { data, router, vault } = await getEvmThorTxInfo({
        sellAsset,
        sellAmountCryptoBaseUnit,
        memo: updatedMemo,
        expiry: quote.expiry,
      })

      return Ok({
        ...quote,
        memo: updatedMemo,
        data,
        router,
        vault,
        aggregator: bestAggregator,
        steps: quote.steps.map(s => ({
          ...s,
          buyAsset,
          buyAmountAfterFeesCryptoBaseUnit: quotedAmountOut.toString(),
          // This is wrong, we should get the get the value before fees or display ETH value received after the thorchain bridge
          buyAmountBeforeFeesCryptoBaseUnit: quotedAmountOut.toString(),
          allowanceContract: ALLOWANCE_CONTRACT,
        })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps,
        isLongtail: true,
        longtailData: {
          L1ToLongtailExpectedAmountOut: quotedAmountOut,
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
