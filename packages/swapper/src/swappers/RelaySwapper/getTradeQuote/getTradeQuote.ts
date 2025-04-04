import { isSome } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { relayChainMap as relayChainMapImplementation } from '../constant'
import { getRelayTradeQuote } from '../utils/getTrade'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  if (!input.sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress is required',
      }),
    )
  }

  const args = {
    buyAsset: input.buyAsset,
    receiveAddress: input.receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit:
      input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAsset: input.sellAsset,
    sendAddress: input.sendAddress,
    quoteOrRate: 'quote' as const,
    accountNumber: input.accountNumber,
    affiliateBps: input.affiliateBps,
    potentialAffiliateBps: input.potentialAffiliateBps,
  }

  const quotesResult = await getRelayTradeQuote(args, deps, relayChainMap)

  return quotesResult.map(quotes =>
    quotes
      .map(quote => {
        if (!quote.receiveAddress) return undefined

        return {
          ...quote,
          quoteOrRate: 'quote' as const,
          receiveAddress: quote.receiveAddress,
          steps: quote.steps.map(step => step) as
            | [TradeQuoteStep]
            | [TradeQuoteStep, TradeQuoteStep],
        }
      })
      .filter(isSome),
  )
}
