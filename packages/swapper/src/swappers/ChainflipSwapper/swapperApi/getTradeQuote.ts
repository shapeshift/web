import type {
  GetTradeQuoteInput,
  SwapperDeps,
  TradeQuote,
  TradeQuoteResult,
} from '../../../types'
import { getQuoteOrRate } from '../utils/getQuoteOrRate'

export const getTradeQuote = async (
  input: GetTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  return (await getQuoteOrRate(input, deps)).map(quotes => quotes as TradeQuote[])
}
