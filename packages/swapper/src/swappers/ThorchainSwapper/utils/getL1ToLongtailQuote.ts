import { TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import { convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
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
  getAffiliate,
  getSuccessfulTrades,
  getThorL1TradeQuote,
  getThorStepData,
  TradeType,
} from '../../../utils/thorchain'
import { addL1ToLongtailPartsToMemo } from './addL1ToLongtailPartsToMemo/addL1ToLongtailPartsToMemo'
import { assertValidL1ToLongtailTrade } from './assertValidLongtailTrade'
import { getBestAggregator } from './getBestAggregator'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getL1ToLongtailQuote = async (
  input: ThorTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerancePercentageDecimal,
  } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress: from } = addresses.unwrap()

  const assertion = await assertValidL1ToLongtailTrade({ sellAsset, buyAsset, deps })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { buyAssetFeeAsset, longtailTokens } = assertion.unwrap()

  const l1Tol1QuoteInput: ThorTradeQuoteInput = {
    ...input,
    buyAsset: buyAssetFeeAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  }

  const maybeL1Quotes = await getThorL1TradeQuote(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.L1ToLongTail,
    swapperName,
  )

  if (maybeL1Quotes.isErr()) return Err(maybeL1Quotes.unwrapErr())

  const maybeQuotes = await Promise.allSettled(
    maybeL1Quotes.unwrap().map(async (quote): Promise<Result<ThorTradeQuote, SwapErrorRight>> => {
      const [step] = quote.steps

      const maybeBestAggregator = await getBestAggregator(
        buyAssetFeeAsset,
        getWrappedToken(buyAssetFeeAsset),
        getTokenFromAsset(buyAsset),
        step.buyAmountAfterFeesCryptoBaseUnit,
      )

      if (maybeBestAggregator.isErr()) return Err(maybeBestAggregator.unwrapErr())
      const { bestAggregator, quotedAmountOut } = maybeBestAggregator.unwrap()

      // Paranoia - a zero expected amount out would likely lead to a loss of funds, and is encoded into
      // the memo below as well as the calldata
      if (quotedAmountOut <= 0n) {
        return Err(
          makeSwapErrorRight({
            message: '[getL1ToLongtailQuote] - expected a positive amount out',
            code: TradeQuoteError.InternalError,
          }),
        )
      }

      const updatedMemo = addL1ToLongtailPartsToMemo({
        sellAssetChainId: sellAsset.chainId,
        aggregator: bestAggregator,
        finalAssetAssetId: buyAsset.assetId,
        finalAssetAmountOut: quotedAmountOut.toString(),
        slippageBps: convertDecimalPercentageToBasisPoints(
          slippageTolerancePercentageDecimal ??
            getDefaultSlippageDecimalPercentageForSwapper(swapperName),
        ).toString(),
        quotedMemo: quote.memo,
        longtailTokens,
        affiliate: getAffiliate(swapperName),
      })

      // getThorL1TradeQuote built the step against the pre-aggregator memo, so rebuild the tx data
      // and fees through the shared step data now that the final memo is known
      const stepData = await getThorStepData({
        type: 'quote',
        input,
        from,
        deps,
        swapperName,
        tradeType: TradeType.L1ToLongTail,
        sellAsset,
        sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: updatedMemo,
        expiry: quote.expiry,
        rawMemo: updatedMemo,
      })

      if (stepData.isErr()) return Err(stepData.unwrapErr())
      const { data, transactionData, networkFeeCryptoBaseUnit } = stepData.unwrap()

      return Ok({
        ...quote,
        memo: updatedMemo,
        data,
        steps: quote.steps.map(s => ({
          ...s,
          buyAsset,
          buyAmountAfterFeesCryptoBaseUnit: quotedAmountOut.toString(),
          // This is wrong, we should get the get the value before fees or display ETH value received after the thorchain bridge
          buyAmountBeforeFeesCryptoBaseUnit: quotedAmountOut.toString(),
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
          transactionData,
          feeData: { ...s.feeData, networkFeeCryptoBaseUnit },
        })) as MultiHopTradeQuoteSteps,
        isLongtail: true,
      })
    }),
  )

  return getSuccessfulTrades(maybeQuotes)
}
