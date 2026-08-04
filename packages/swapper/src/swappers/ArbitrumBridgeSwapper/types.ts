import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type ArbitrumBridgeTradeQuoteInput = GetEvmTradeQuoteInput
export type ArbitrumBridgeTradeRateInput = GetEvmTradeRateInput

export enum BRIDGE_TYPE {
  ETH_DEPOSIT = 'ETH Deposit',
  ERC20_DEPOSIT = 'ERC20 Deposit',
  ETH_WITHDRAWAL = 'ETH Withdrawal',
  ERC20_WITHDRAWAL = 'ERC20 Withdrawal',
}
