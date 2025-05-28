import type { Route } from '@lifi/sdk'

import type { TradeQuote, TradeRate } from '../../../types'

export type LifiTools = {
  bridges: string[] | undefined
  exchanges: string[] | undefined
}

export interface LifiTradeQuote extends TradeQuote {
  selectedLifiRoute?: Route
  lifiTools?: LifiTools
}
export interface LifiTradeRate extends TradeRate {
  selectedLifiRoute?: Route
  lifiTools?: LifiTools
}

export const isLifiTradeQuote = (tradeQuote: TradeQuote): tradeQuote is LifiTradeQuote => {
  return 'selectedLifiRoute' in tradeQuote
}
