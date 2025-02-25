import type { TradeQuote, TradeRate } from '../../types'

export enum BRIDGE_TYPE {
  ETH_DEPOSIT = 'ETH Deposit',
  ERC20_DEPOSIT = 'ERC20 Deposit',
  ETH_WITHDRAWAL = 'ETH Withdrawal',
  ERC20_WITHDRAWAL = 'ERC20 Withdrawal',
}

type ArbitrumBridgeSpecificMetadata = {
  direction: 'deposit' | 'withdrawal'
}

export type ArbitrumBridgeTradeQuote = TradeQuote & ArbitrumBridgeSpecificMetadata
export type ArbitrumBridgeTradeRate = TradeRate & ArbitrumBridgeSpecificMetadata
