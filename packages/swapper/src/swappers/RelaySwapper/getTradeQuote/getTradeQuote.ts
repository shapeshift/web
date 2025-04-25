import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { getTrade } from '../utils/getTrade'

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

  if (!input.receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'receiveAddress is required',
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
    xpub: 'xpub' in input ? (input as GetUtxoTradeQuoteInput).xpub : undefined,
  }

  const quotesResult = await getTrade({ input: args, deps, relayChainMap })

  return quotesResult
}
