import { type GetTradeRateInput, type SwapperDeps, type TradeRateResult } from '../../../types'
import { getRateOrQuote } from '../utils/getRateOrQuote'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<TradeRateResult> => {
  // A quote is a rate with guaranteed BIP44 params (account number/sender),
  // so we can return quotes which can be used as rates, but not the other way around
  return (await getRateOrQuote(input, deps)) as TradeRateResult
}
