import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getTrade } from '../utils/getTrade'
import type { AcrossTradeQuoteInput } from '../utils/types'

export const getTradeQuote = (
  input: AcrossTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  if (!input.sendAddress) {
    return Promise.resolve(Err(makeSwapErrorRight({ message: 'sendAddress is required' })))
  }

  if (!input.receiveAddress) {
    return Promise.resolve(Err(makeSwapErrorRight({ message: 'receiveAddress is required' })))
  }

  return getTrade({ input, deps })
}
