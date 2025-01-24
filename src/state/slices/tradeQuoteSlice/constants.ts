import { TradeQuoteError } from '@shapeshiftoss/swapper'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'

import type { TradeQuoteSliceState } from './types'

export const initialState: TradeQuoteSliceState = {
  activeQuoteMeta: undefined,
  tradeQuotes: {},
  tradeQuoteDisplayCache: [],
  isTradeQuoteRequestAborted: false,
}

export const SWAPPER_USER_ERRORS = [
  TradeQuoteError.SellAmountBelowTradeFee,
  TradeQuoteError.SellAmountBelowMinimum,
  TradeQuoteValidationError.SellAmountBelowTradeFee,
  TradeQuoteValidationError.InsufficientFirstHopAssetBalance,
  TradeQuoteValidationError.InsufficientFirstHopFeeAssetBalance,
  TradeQuoteValidationError.InsufficientSecondHopFeeAssetBalance,
  TradeQuoteValidationError.InsufficientFundsForProtocolFee,
]
