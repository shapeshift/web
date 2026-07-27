import { ethChainId } from '@shapeshiftoss/caip'
import {
  TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
  viemClientByChainId,
} from '@shapeshiftoss/contracts'
import type { EvmChainId } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero, isFulfilled, isRejected } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import assert from 'assert'

import type {
  GetTradeQuoteInput,
  MultiHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { ThorEvmTradeQuote, ThorTradeQuote } from '../../../utils/thorchain'
import { getL1RateOrQuote, getThorStepData, TradeType } from '../../../utils/thorchain'
import { getBestAggregator } from './getBestAggregator'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

const LONGTAIL_TO_L1_DEADLINE_SECONDS = 600n

// This just uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: GetTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const { sendAddress: from } = input

  if (!from) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress is required',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

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

  const l1Tol1QuoteInput: GetTradeQuoteInput = {
    ...input,
    sellAsset: buyAssetFeeAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  // The sell side is asserted to be ethereum above, so these are always evm quotes
  const thorchainQuotes = await getL1RateOrQuote<ThorEvmTradeQuote>(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.LongTailToL1,
    swapperName,
  )

  // Paranoia - a zero expected amount out would likely lead to a loss of funds
  if (quotedAmountOut <= 0n) {
    return Err(
      makeSwapErrorRight({
        message: '[getLongtailToL1Quote] - expected a positive amount out',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  if (thorchainQuotes.isErr()) return Err(thorchainQuotes.unwrapErr())

  const promises = await Promise.allSettled(
    thorchainQuotes.unwrap().map(async (q): Promise<ThorTradeQuote> => {
      const amountOutMin = BigInt(
        bnOrZero(quotedAmountOut.toString())
          .times(bn(1).minus(q.slippageTolerancePercentageDecimal ?? 0))
          .toFixed(0, BigNumber.ROUND_UP),
      )

      // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade
      assert(amountOutMin > 0n, 'expected amountOutMin to be a positive amount')

      // The deadline doubles as the THORChain deposit expiry, so it stays pinned to quote time rather
      // than being refreshed at execution - a stale quote reverts instead of executing on newer terms
      const deadline = BigInt(Math.floor(Date.now() / 1000)) + LONGTAIL_TO_L1_DEADLINE_SECONDS

      // Swap the direct deposit built by getL1RateOrQuote for the aggregator swapIn we actually execute
      const { data, transactionData, networkFeeCryptoBaseUnit } = await getThorStepData({
        type: 'quote',
        input,
        from,
        deps,
        swapperName,
        tradeType: TradeType.LongTailToL1,
        sellAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: q.memo,
        expiry: q.expiry,
        rawMemo: q.memo,
        longtail: { aggregator: bestAggregator, amountOutMin, deadline },
      })

      return {
        ...q,
        data: data ?? q.data,
        aggregator: bestAggregator,
        // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
        steps: q.steps.map(s => ({
          ...s,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sellAsset,
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
          transactionData,
          feeData: { ...s.feeData, networkFeeCryptoBaseUnit },
        })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps
        isLongtail: true,
        longtailData: {
          longtailToL1ExpectedAmountOut: quotedAmountOut.toString(),
        },
      } satisfies ThorTradeQuote
    }),
  )

  const updatedQuotes = promises.filter(isFulfilled).map(promise => promise.value)

  if (!updatedQuotes.length) {
    return Err(
      makeSwapErrorRight({
        message: '[getLongtailToL1Quote] - failed to build swapIn quotes',
        code: TradeQuoteError.InternalError,
        cause: promises.filter(isRejected).map(promise => promise.reason),
      }),
    )
  }

  return Ok(updatedQuotes)
}
