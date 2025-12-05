import type { Result } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetTronTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { getQuoteOrRate } from '../utils/getQuoteOrRate'

export const getSunioTradeQuote = (
  input: GetTronTradeQuoteInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>> => {
  return getQuoteOrRate(input, deps)
}
