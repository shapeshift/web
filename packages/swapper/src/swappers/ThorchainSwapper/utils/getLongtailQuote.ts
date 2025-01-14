import { ethChainId } from '@shapeshiftoss/caip'
import {
  TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
  viemClientByChainId,
} from '@shapeshiftoss/contracts'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import assert from 'assert'

import type {
  CommonTradeQuoteInput,
  MultiHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { ThorTradeQuote } from '../types'
import { getBestAggregator } from './getBestAggregator'
import { getL1Quote } from './getL1quote'
import { getTokenFromAsset, getWrappedToken, TradeType } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
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

  const sellChainId = sellAsset.chainId
  const buyAssetFeeAssetId = deps.assertGetChainAdapter(sellChainId)?.getFeeAssetId()
  const buyAssetFeeAsset = buyAssetFeeAssetId ? deps.assetsById[buyAssetFeeAssetId] : undefined
  if (!buyAssetFeeAsset) {
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
    buyAssetFeeAsset,
    getTokenFromAsset(sellAsset),
    getWrappedToken(buyAssetFeeAsset),
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  if (maybeBestAggregator.isErr()) {
    return Err(maybeBestAggregator.unwrapErr())
  }

  const { bestAggregator, quotedAmountOut } = maybeBestAggregator.unwrap()

  const l1Tol1QuoteInput: CommonTradeQuoteInput = {
    ...input,
    sellAsset: buyAssetFeeAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  const thorchainQuotes = await getL1Quote(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.LongTailToL1,
  )

  return thorchainQuotes.andThen(quotes => {
    const updatedQuotes = quotes.map(
      q =>
        ({
          ...q,
          aggregator: bestAggregator,
          // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
          steps: q.steps.map(s => ({
            ...s,
            sellAmountIncludingProtocolFeesCryptoBaseUnit,
            sellAsset,
            allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
          })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps
          isLongtail: true,
          longtailData: {
            longtailToL1ExpectedAmountOut: quotedAmountOut.toString(),
          },
        }) satisfies ThorTradeQuote,
    )

    return Ok(updatedQuotes)
  })
}
