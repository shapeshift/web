import type { TradeQuote, TradeRate } from '../../../types'

export type RelayTools = {
  bridges: string[] | undefined
  exchanges: string[] | undefined
}

export interface RelayTradeQuote extends TradeQuote {
  selectedRelayRoute?: string
  relayTools?: RelayTools
}
export interface RelayTradeRate extends TradeRate {
  selectedRelayRoute?: string
  relayTools?: RelayTools
}
