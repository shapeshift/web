import type { Result } from '@sniptt/monads'
import type { GetTradeQuoteInput, SwapErrorRight, SwapperName, TradeQuote2 } from 'lib/swapper/api'
import type { ReduxState } from 'state/reducer'

export type QuoteHelperType = (
  getTradeQuoteInput: GetTradeQuoteInput,
  state: ReduxState,
) => Promise<Result<TradeQuote2, SwapErrorRight>>

export type ApiQuote = {
  quote: TradeQuote2 | undefined
  error: SwapErrorRight | undefined
  swapperName: SwapperName
  inputOutputRatio: number
}
