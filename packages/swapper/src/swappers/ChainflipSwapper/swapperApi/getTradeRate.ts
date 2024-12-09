import type { Result } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { _getTradeQuote } from './getTradeQuote'

// This isn't a mistake. A trade rate *is* a trade quote. Chainflip doesn't really have a notion of a trade quote,
// they do have a notion of a "swap" (which we effectively only use to get the deposit address), which is irrelevant to the notion of quote vs. rate
export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const rates = await _getTradeQuote(input as unknown as CommonTradeQuoteInput, deps)
  return rates as unknown as Result<TradeRate[], SwapErrorRight>
}
