import type { Route } from '@lifi/sdk'
import type { TradeQuote } from 'lib/swapper/types'

export interface LifiTradeQuote extends TradeQuote {
  selectedLifiRoute?: Route
}

export type LifiTool = {
  key: string
  name: string
  logoURI: string
}
