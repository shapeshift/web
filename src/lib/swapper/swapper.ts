import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { osmosisApi } from 'lib/swapper/swappers/OsmosisSwapper/endpoints'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { isFulfilled as isFulfilledPredicate, timeout } from 'lib/utils'

import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote2 } from './api'
import { SwapperName } from './api'
import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS } from './constants'
import type { QuoteResult, TradeQuoteDeps } from './types'

// gets trade quotes
export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInput,
  enabledSwappers: SwapperName[],
  deps: TradeQuoteDeps,
): Promise<QuoteResult[]> => {
  const swappers = [
    {
      swapperName: SwapperName.Osmosis,
      getTradeQuote: osmosisApi.getTradeQuote,
    },
    {
      swapperName: SwapperName.LIFI,
      getTradeQuote: lifiApi.getTradeQuote,
    },
    {
      swapperName: SwapperName.Thorchain,
      getTradeQuote: thorchainApi.getTradeQuote,
    },
    {
      swapperName: SwapperName.Zrx,
      getTradeQuote: zrxApi.getTradeQuote,
    },
    {
      swapperName: SwapperName.OneInch,
      getTradeQuote: oneInchApi.getTradeQuote,
    },
    {
      swapperName: SwapperName.CowSwap,
      getTradeQuote: cowApi.getTradeQuote,
    },
  ]

  const quotes = await Promise.allSettled(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapperName, getTradeQuote }) =>
        timeout<TradeQuote2, SwapErrorRight>(
          getTradeQuote(getTradeQuoteInput, deps),
          QUOTE_TIMEOUT_MS,
          QUOTE_TIMEOUT_ERROR,
        ).then(quote => ({
          ...quote,
          swapperName,
        })),
      ),
  )

  // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
  // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
  const successfulQuotes = quotes
    .filter(result => {
      const isFulfilled = isFulfilledPredicate(result)
      if (!isFulfilled) {
        console.error(result.reason)
      }
      return isFulfilled
    })
    .map(result => (result as PromiseFulfilledResult<QuoteResult>).value)

  return successfulQuotes
}
