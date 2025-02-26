import type { ChainId } from '@shapeshiftoss/caip'
import type {
  MultiHopTradeQuote,
  MultiHopTradeRate,
  TradeQuote,
  TradeRate,
} from '@shapeshiftoss/swapper'

// All chains currently support Tx history, but that might not be the case as we support more chains
export const chainSupportsTxHistory = (_chainId: ChainId): boolean => true

export const isMultiHopTradeQuote = (quote: TradeQuote): quote is MultiHopTradeQuote =>
  quote.steps.length > 1

export const isMultiHopTradeRate = (quote: TradeRate): quote is MultiHopTradeRate =>
  quote.steps.length > 1
