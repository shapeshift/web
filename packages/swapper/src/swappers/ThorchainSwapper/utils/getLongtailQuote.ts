import { TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import { BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  MultiHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { assertQuoteAddresses, makeSwapErrorRight } from '../../../utils'
import type { ThorTradeQuote, ThorTradeQuoteInput } from '../../../utils/thorchain'
import {
  getSuccessfulTrades,
  getThorL1TradeQuote,
  getThorStepData,
  TradeType,
} from '../../../utils/thorchain'
import { assertValidLongtailToL1Trade } from './assertValidLongtailTrade'
import { getBestAggregator } from './getBestAggregator'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

const LONGTAIL_TO_L1_DEADLINE_SECONDS = 600n

// This just uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: ThorTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress: from } = addresses.unwrap()

  const assertion = assertValidLongtailToL1Trade({ sellAsset, deps })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { buyAssetFeeAsset } = assertion.unwrap()

  const maybeBestAggregator = await getBestAggregator(
    buyAssetFeeAsset,
    getTokenFromAsset(sellAsset),
    getWrappedToken(buyAssetFeeAsset),
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  if (maybeBestAggregator.isErr()) return Err(maybeBestAggregator.unwrapErr())
  const { bestAggregator, quotedAmountOut } = maybeBestAggregator.unwrap()

  // Paranoia - a zero expected amount out would likely lead to a loss of funds
  if (quotedAmountOut <= 0n) {
    return Err(
      makeSwapErrorRight({
        message: '[getLongtailToL1Quote] - expected a positive amount out',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const l1Tol1QuoteInput: ThorTradeQuoteInput = {
    ...input,
    sellAsset: buyAssetFeeAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  // The sell side is asserted to be ethereum above, so these are always evm quotes
  const maybeL1Quotes = await getThorL1TradeQuote(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.LongTailToL1,
    swapperName,
  )

  if (maybeL1Quotes.isErr()) return Err(maybeL1Quotes.unwrapErr())

  const maybeQuotes = await Promise.allSettled(
    maybeL1Quotes.unwrap().map(async (quote): Promise<Result<ThorTradeQuote, SwapErrorRight>> => {
      const amountOutMin = BigInt(
        bnOrZero(quotedAmountOut.toString())
          .times(bn(1).minus(quote.slippageTolerancePercentageDecimal ?? 0))
          .toFixed(0, BigNumber.ROUND_UP),
      )

      // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade
      if (amountOutMin <= 0n) {
        return Err(
          makeSwapErrorRight({
            message: '[getLongtailToL1Quote] - expected amountOutMin to be a positive amount',
            code: TradeQuoteError.InternalError,
          }),
        )
      }

      // The deadline doubles as the THORChain deposit expiry, so it stays pinned to quote time rather
      // than being refreshed at execution - a stale quote reverts instead of executing on newer terms
      const deadline = BigInt(Math.floor(Date.now() / 1000)) + LONGTAIL_TO_L1_DEADLINE_SECONDS

      // Swap the direct deposit built by getThorL1TradeQuote for the aggregator swapIn we execute
      const maybeStepData = await getThorStepData({
        type: 'quote',
        input,
        from,
        deps,
        swapperName,
        tradeType: TradeType.LongTailToL1,
        sellAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: quote.memo,
        expiry: quote.expiry,
        rawMemo: quote.memo,
        longtail: { aggregator: bestAggregator, amountOutMin, deadline },
      })

      if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
      const { data, transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

      return Ok({
        ...quote,
        data: data ?? quote.data,
        aggregator: bestAggregator,
        // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
        steps: quote.steps.map(s => ({
          ...s,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sellAsset,
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
          transactionData,
          feeData: { ...s.feeData, networkFeeCryptoBaseUnit },
        })) as MultiHopTradeQuoteSteps,
        isLongtail: true,
        longtailData: {
          longtailToL1ExpectedAmountOut: quotedAmountOut.toString(),
        },
      })
    }),
  )

  return getSuccessfulTrades(maybeQuotes)
}
