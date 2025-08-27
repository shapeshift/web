import { bnOrZero, timeoutMonadic, timeoutMonadicWithFallback } from '@shapeshiftoss/utils'

import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS, swappers } from './constants'
import type {
  GetTradeQuoteInputWithWallet,
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

export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInputWithWallet,
  swapperName: SwapperName,
  deps: SwapperDeps,
): Promise<QuoteResult | undefined> => {
  if (bnOrZero(getTradeQuoteInput.affiliateBps).lt(0)) return
  if (getTradeQuoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') return

  const swapper = swappers[swapperName]

  if (swapper === undefined) return

  try {
    const quote = await timeoutMonadic<TradeQuote[], SwapErrorRight>(
      swapper.getTradeQuote(getTradeQuoteInput, deps),
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
  getTradeRateInput: GetTradeRateInput,
  swapperName: SwapperName,
  deps: SwapperDeps,
  quoteTimeoutMs: number = QUOTE_TIMEOUT_MS,
): Promise<RateResult | undefined> => {
  if (bnOrZero(getTradeRateInput.affiliateBps).lt(0)) return
  if (getTradeRateInput.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') return

  const swapper = swappers[swapperName]

  if (swapper === undefined) return

  try {
    const { result, fallback } = timeoutMonadicWithFallback<TradeRate[], SwapErrorRight>(
      swapper.getTradeRate(getTradeRateInput, deps),
      quoteTimeoutMs,
      makeSwapErrorRight({
        code: TradeQuoteError.Timeout,
        message: `quote timed out after ${quoteTimeoutMs / 1000}s`,
      }),
    )

    const quote = await result

    return {
      ...quote,
      fallback,
      swapperName,
    }
  } catch (e) {
    // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
    // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
    console.error('Unhandled error. Use monadic error handling: ', e)
  }
}
