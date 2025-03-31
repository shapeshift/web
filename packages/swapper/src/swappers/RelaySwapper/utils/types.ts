import type { Execute } from '@reservoir0x/relay-sdk'

import type { TradeQuote, TradeRate } from '../../../types'

export interface RelayTradeQuote extends TradeQuote {
  selectedRelayRoute?: Execute
}
export interface RelayTradeRate extends TradeRate {
  selectedRelayRoute?: Execute
}

export type RelayStatus = {
  status: 'success' | 'failed' | 'pending' | 'refund' | 'delayed' | 'waiting'
  inTxHashes: string[]
  txHashes: string[]
  time: number
  originChainId: number
  destinationChainId: number
}
