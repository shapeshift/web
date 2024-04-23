import { ethChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetTradeQuoteInput, MultiHopTradeQuoteSteps } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, type SwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import assert from 'assert'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { viemClientByChainId } from 'lib/viem-client'

import { ALLOWANCE_CONTRACT } from '../constants'
import type { ThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { getBestAggregator } from './getBestAggregator'
import { getL1quote } from './getL1quote'
import { getTokenFromAsset, getWrappedToken, TradeType } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: GetTradeQuoteInput,
  streamingInterval: number,
  assetsById: AssetsByIdPartial,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  /*
    We only support ethereum longtail -> L1 swaps for now.
    We can later add BSC via UniV3, or Avalanche (e.g. via PancakeSwap)
  */
  if (sellAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${sellAsset.chainId}.`,
        code: TradeQuoteError.UnsupportedChain,
        details: { sellAssetChainId: sellAsset.chainId },
      }),
    )
  }

  const chainAdapterManager = getChainAdapterManager()
  const sellChainId = sellAsset.chainId
  const nativeBuyAssetId = chainAdapterManager.get(sellChainId)?.getFeeAssetId()
  const nativeBuyAsset = nativeBuyAssetId ? assetsById[nativeBuyAssetId] : undefined
  if (!nativeBuyAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId: sellChainId },
      }),
    )
  }

  // TODO: use more than just UniswapV3, and also consider trianglar routes.
  const publicClient = viemClientByChainId[sellChainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${sellChainId}'`)

  const maybeBestAggregator = await getBestAggregator(
    nativeBuyAsset,
    getTokenFromAsset(sellAsset),
    getWrappedToken(nativeBuyAsset),
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  if (maybeBestAggregator.isErr()) {
    return Err(maybeBestAggregator.unwrapErr())
  }

  const { bestAggregator, quotedAmountOut } = maybeBestAggregator.unwrap()

  const l1Tol1QuoteInput: GetTradeQuoteInput = {
    ...input,
    sellAsset: nativeBuyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  const thorchainQuotes = await getL1quote(
    l1Tol1QuoteInput,
    streamingInterval,
    TradeType.LongTailToL1,
  )

  return thorchainQuotes.andThen(quotes => {
    const updatedQuotes: ThorTradeQuote[] = quotes.map(q => ({
      ...q,
      aggregator: bestAggregator,
      // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
      steps: q.steps.map(s => ({
        ...s,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        sellAsset,
        allowanceContract: ALLOWANCE_CONTRACT,
      })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps
      isLongtail: true,
      longtailData: {
        longtailToL1ExpectedAmountOut: quotedAmountOut,
      },
    }))

    return Ok(updatedQuotes)
  })
}
