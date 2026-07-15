import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { getTrade } from '../utils/getTrade'
import type { RelayTradeQuoteInput } from '../utils/types'

export const getTradeQuote = (
  input: RelayTradeQuoteInput,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  if (!input.sendAddress) {
    return Promise.resolve(Err(makeSwapErrorRight({ message: 'sendAddress is required' })))
  }

  if (!input.receiveAddress) {
    return Promise.resolve(Err(makeSwapErrorRight({ message: 'receiveAddress is required' })))
  }

  return getTrade({ input, deps, relayChainMap })
}
