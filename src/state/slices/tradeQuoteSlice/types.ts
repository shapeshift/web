import type { SwapperName } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { ApiQuote } from 'state/apis/swapper/types'

export type ActiveQuoteMeta = {
  swapperName: SwapperName
  identifier: string
}

export type TradeQuoteSliceState = {
  activeQuoteMeta: ActiveQuoteMeta | undefined // the selected quote metadata used to find the active quote in the api responses
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>> // mapping from swapperName to quoteId to ApiQuote
  tradeQuoteDisplayCache: ApiQuote[]
  isTradeQuoteRequestAborted: boolean // used to conditionally render results and loading state
}
