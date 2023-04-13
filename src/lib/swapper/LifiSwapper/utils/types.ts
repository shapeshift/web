import type { RoutesRequest } from '@lifi/sdk'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ExecuteTradeInput } from '@shapeshiftoss/swapper'
import type { Trade, TradeQuote } from '@shapeshiftoss/swapper/dist/api'

export interface LifiTrade extends Trade<EvmChainId> {
  routesRequest: RoutesRequest
}

export interface LifiExecuteTradeInput extends Omit<ExecuteTradeInput<EvmChainId>, 'trade'> {
  trade: LifiTrade
}

export interface LifiTradeQuote extends TradeQuote<EvmChainId> {
  routesRequest: RoutesRequest
}
