import type { Route } from '@lifi/sdk'

import type { TradeQuote, TradeRate } from '../../../types'

export interface LifiTradeQuote extends TradeQuote {
  selectedLifiRoute?: Route
}
export interface LifiTradeRate extends TradeRate {
  selectedLifiRoute?: Route
}

export type LifiTool = {
  key: string
  name: string
  logoURI: string
}
