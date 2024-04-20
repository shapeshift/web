import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { GetTradeQuoteInput, MultiHopTradeQuoteSteps } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, type SwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import { isFulfilled, isRejected } from 'lib/utils'

import type { ThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { addAggregatorAndDestinationToMemo } from './addAggregatorAndDestinationToMemo'
import { getBestAggregator } from './getBestAggregator'
import { getL1quote } from './getL1quote'
import type { AggregatorContract } from './longTailHelpers'
import { getTokenFromAsset, getWrappedToken, TradeType } from './longTailHelpers'

// This just gets uses UniswapV3 to get the longtail quote for now.
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

  // TODO: Move these constants outside
  // TODO2: use more than just UniswapV3, and also consider trianglar routes.
  const ALLOWANCE_CONTRACT = '0xF892Fef9dA200d9E84c9b0647ecFF0F34633aBe8' // TSAggregatorTokenTransferProxy

  const l1Tol1QuoteInput: GetTradeQuoteInput = {
    ...input,
    buyAsset: nativeBuyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  }

  const thorchainQuotes = await getL1quote(
    l1Tol1QuoteInput,
    streamingInterval,
    TradeType.L1ToLongTail,
  )

  const unwrappedThorchainQuotes = thorchainQuotes.unwrap()

  let bestAggregator: AggregatorContract
  let quotedAmountOut: bigint

  const promises: PromiseSettledResult<ThorTradeQuote>[] = await Promise.allSettled(
    unwrappedThorchainQuotes.map(async quote => {
      const onlyStep = quote.steps[0]

      const result = await getBestAggregator(
        nativeBuyAsset,
        getWrappedToken(nativeBuyAsset),
        getTokenFromAsset(buyAsset),
        onlyStep.buyAmountAfterFeesCryptoBaseUnit,
      )

      const unwrappedResult = result.unwrap()

      bestAggregator = unwrappedResult.bestAggregator
      quotedAmountOut = unwrappedResult.quotedAmountOut

      const minAmountOut = BigInt(
        bnOrZero(quotedAmountOut.toString())
          .times(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
          .toFixed(0, BigNumber.ROUND_UP),
      )

      // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade.
      assert(minAmountOut > 0n, 'expected expectedAmountOut to be a positive amount')

      const updatedMemo = addAggregatorAndDestinationToMemo({
        aggregator: bestAggregator,
        destinationToken: fromAssetId(buyAsset.assetId).assetReference as Address,
        minAmountOut: minAmountOut.toString(),
        quotedMemo: quote.memo,
      })

      const { data, router, vault } = await getEvmThorTxInfo({
        sellAsset,
        sellAmountCryptoBaseUnit,
        memo: updatedMemo,
        expiry: quote.expiry,
      })

      return {
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
          allowanceContract: ALLOWANCE_CONTRACT,
        })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps,
        isLongtail: true,
        longtailData: {
          L1ToLongtailExpectedAmountOut: quotedAmountOut,
        },
      }
    }),
  )

  if (promises.every(isRejected)) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote] - failed to get best aggregator',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const updatedQuotes = promises.filter(isFulfilled).map(({ value }) => value)

  return Ok(updatedQuotes)
}
