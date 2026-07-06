import type { TradeQuote, TradeRate } from '../../types'

export enum BRIDGE_TYPE {
  ETH_DEPOSIT = 'ETH Deposit',
  ERC20_DEPOSIT = 'ERC20 Deposit',
  ETH_WITHDRAWAL = 'ETH Withdrawal',
  ERC20_WITHDRAWAL = 'ERC20 Withdrawal',
}

export type ArbitrumBridgeMetadata = {
  swapper: 'arbitrumBridge'
  direction: 'deposit' | 'withdrawal'
}

export type ArbitrumBridgeTradeQuote = TradeQuote & { direction: 'deposit' | 'withdrawal' }
export type ArbitrumBridgeTradeRate = TradeRate & { direction: 'deposit' | 'withdrawal' }
