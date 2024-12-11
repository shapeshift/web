import type { Route } from '@lifi/sdk'

import type { TradeQuote, TradeRate } from '../../../types'

export interface LifiTradeQuote extends TradeQuote {
  selectedLifiRoute?: Route
  lifiTools?: string[] | undefined
}
export interface LifiTradeRate extends TradeRate {
  selectedLifiRoute?: Route
  lifiTools?: string[] | undefined
}

export type LifiTool = {
  key: string
  name: string
  logoURI: string
}
