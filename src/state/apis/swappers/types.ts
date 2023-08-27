import type { Result } from '@sniptt/monads'
import type { GetTradeQuoteInput, SwapErrorRight, SwapperName, TradeQuote } from 'lib/swapper/types'
import type { ReduxState } from 'state/reducer'

export type QuoteHelperType = (
  getTradeQuoteInput: GetTradeQuoteInput,
  state: ReduxState,
) => Promise<Result<TradeQuote, SwapErrorRight>>

export type ApiQuote = {
  index: number
  quote: TradeQuote | undefined
  error: SwapErrorRight | undefined
  swapperName: SwapperName
  inputOutputRatio: number
}
