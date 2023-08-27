import type { Route } from '@lifi/sdk'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { TradeQuote } from 'lib/swapper/types'

export interface LifiTradeQuote extends TradeQuote<EvmChainId> {
  selectedLifiRoute?: Route
}

export type LifiTool = {
  key: string
  name: string
  logoURI: string
}
