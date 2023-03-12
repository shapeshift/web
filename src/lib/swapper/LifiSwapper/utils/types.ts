import type { Route } from '@lifi/sdk'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ExecuteTradeInput, Trade } from '@shapeshiftoss/swapper'

export interface LifiTrade extends Trade<EvmChainId> {
  route: Route
}

export interface LifiExecuteTradeInput extends ExecuteTradeInput<EvmChainId> {
  trade: LifiTrade
}
