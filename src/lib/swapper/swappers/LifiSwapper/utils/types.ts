import type { Route } from '@lifi/sdk'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { TradeQuote } from 'lib/swapper/api'

export interface LifiTradeQuote extends TradeQuote<EvmChainId> {
  selectedLifiRoute?: Route
}
