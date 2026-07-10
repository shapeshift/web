import type { GetTradeRateInput, SwapperDeps, TradeRate, TradeRateResult } from '../../../types'
import { getQuoteOrRate } from '../utils/getQuoteOrRate'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<TradeRateResult> => {
  return (await getQuoteOrRate(input, deps)).map(quotes => quotes as TradeRate[])
}
