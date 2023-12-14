import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperName,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
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
