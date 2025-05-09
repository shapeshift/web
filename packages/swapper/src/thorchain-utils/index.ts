import type { TradeRate } from '../types'
import type { ThorTradeRate } from './types'

export * from './checkTradeStatus'
export * from './getInboundAddressDataForChain'
export * from './memo'
export * from './routerCallData/routerCalldata'
export * from './service'
export * from './types'

export * as cosmossdk from './cosmossdk'
export * as evm from './evm'
export * as utxo from './utxo'

export { getMaxBytesLengthByChainId } from './constants'

export const isThorTradeRate = (quote: TradeRate | undefined): quote is ThorTradeRate =>
  !!quote && 'tradeType' in quote && 'vault' in quote
