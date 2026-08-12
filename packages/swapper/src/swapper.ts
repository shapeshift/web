import { bnOrZero, timeoutMonadic, timeoutMonadicWithOriginal } from '@shapeshiftoss/utils'
import { Err } from '@sniptt/monads'

import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS, swappers } from './constants'
import type {
  GetExactOutputTradeQuoteInput,
  GetExactOutputTradeRateInput,
  GetTradeQuoteInput,
  GetTradeRateInput,
  QuoteResult,
  RateResult,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
  TradeQuote,
  TradeRate,
} from './types'
import { TradeQuoteError } from './types'
import { makeSwapErrorRight } from './utils'

const EXACT_OUTPUT_NOT_SUPPORTED_ERROR = makeSwapErrorRight({
  code: TradeQuoteError.ExactOutputNotSupported,
  message: 'This swapper cannot derive a sell amount from an exact buy amount',
})

export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInput | GetExactOutputTradeQuoteInput,
  swapperName: SwapperName,
  deps: SwapperDeps,
): Promise<QuoteResult | undefined> => {
  if (bnOrZero(getTradeQuoteInput.affiliateBps).lt(0)) return

  const swapper = swappers[swapperName]
  if (swapper === undefined) return

  // Compared numerically so a padded zero can't slip through as an amount
  const drivingAmount =
    'buyAmountCryptoBaseUnit' in getTradeQuoteInput
      ? getTradeQuoteInput.buyAmountCryptoBaseUnit
      : getTradeQuoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit

  if (bnOrZero(drivingAmount).isZero()) return

  const quotePromise =
    'buyAmountCryptoBaseUnit' in getTradeQuoteInput
      ? swapper.getExactOutputTradeQuote?.(getTradeQuoteInput, deps)
      : swapper.getTradeQuote(getTradeQuoteInput, deps)

  if (!quotePromise) return { ...Err(EXACT_OUTPUT_NOT_SUPPORTED_ERROR), swapperName }

  try {
    const quote = await timeoutMonadic<TradeQuote[], SwapErrorRight>(
      quotePromise,
      QUOTE_TIMEOUT_MS,
      QUOTE_TIMEOUT_ERROR,
    )

    return {
      ...quote,
      swapperName,
    }
  } catch (e) {
    // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
    // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
    console.error('Unhandled error. Use monadic error handling: ', e)
  }
}

export const getTradeRates = async (
  getTradeRateInput: GetTradeRateInput | GetExactOutputTradeRateInput,
  swapperName: SwapperName,
  deps: SwapperDeps,
  quoteTimeoutMs: number = QUOTE_TIMEOUT_MS,
): Promise<RateResult | undefined> => {
  if (bnOrZero(getTradeRateInput.affiliateBps).lt(0)) return

  const swapper = swappers[swapperName]
  if (swapper === undefined) return

  // Compared numerically so a padded zero can't slip through as an amount
  const drivingAmount =
    'buyAmountCryptoBaseUnit' in getTradeRateInput
      ? getTradeRateInput.buyAmountCryptoBaseUnit
      : getTradeRateInput.sellAmountIncludingProtocolFeesCryptoBaseUnit

  if (bnOrZero(drivingAmount).isZero()) return

  const ratePromise =
    'buyAmountCryptoBaseUnit' in getTradeRateInput
      ? swapper.getExactOutputTradeRate?.(getTradeRateInput, deps)
      : swapper.getTradeRate(getTradeRateInput, deps)

  if (!ratePromise) return { ...Err(EXACT_OUTPUT_NOT_SUPPORTED_ERROR), swapperName }

  try {
    const { timed, original } = timeoutMonadicWithOriginal<TradeRate[], SwapErrorRight>(
      ratePromise,
      quoteTimeoutMs,
      makeSwapErrorRight({
        code: TradeQuoteError.Timeout,
        message: `quote timed out after ${quoteTimeoutMs / 1000}s`,
      }),
    )

    const quote = await timed

    return {
      ...quote,
      fallback: original,
      swapperName,
    }
  } catch (e) {
    // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
    // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
    console.error('Unhandled error. Use monadic error handling: ', e)
  }
}
