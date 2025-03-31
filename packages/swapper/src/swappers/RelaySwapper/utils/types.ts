import type { Execute } from '@reservoir0x/relay-sdk'

import type { TradeQuote, TradeRate } from '../../../types'

export interface RelayTradeQuote extends TradeQuote {
  selectedRelayRoute?: Execute
}
export interface RelayTradeRate extends TradeRate {
  selectedRelayRoute?: Execute
}
