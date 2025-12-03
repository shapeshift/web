import type { Result } from '@sniptt/monads'

import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getQuoteOrRate } from '../utils/getQuoteOrRate'

export const getSunioTradeRate = (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate, SwapErrorRight>> => {
  return getQuoteOrRate(input, deps)
}
