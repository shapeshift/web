import type { Route } from '@lifi/sdk'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ExecuteTradeInput, Trade, TradeQuote } from 'lib/swapper/api'

export interface LifiTrade extends Trade<EvmChainId> {
  selectedLifiRoute?: Route
}

export interface LifiExecuteTradeInput extends Omit<ExecuteTradeInput<EvmChainId>, 'trade'> {
  trade: LifiTrade
}

export interface LifiTradeQuote<MaybeUnknownNetworkFee extends boolean>
  extends TradeQuote<EvmChainId, MaybeUnknownNetworkFee> {
  selectedLifiRoute?: Route
}
