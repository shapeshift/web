import type { ChainId } from '@shapeshiftoss/caip'
import type {
  MultiHopTradeQuote,
  MultiHopTradeRate,
  TradeQuoteOrRate,
} from '@shapeshiftoss/swapper'

// All chains currently support Tx history, but that might not be the case as we support more chains
export const chainSupportsTxHistory = (_chainId: ChainId): boolean => true

export const isMultiHopTradeQuote = (
  quote: TradeQuoteOrRate,
): quote is MultiHopTradeQuote | MultiHopTradeRate => quote.steps.length > 1
