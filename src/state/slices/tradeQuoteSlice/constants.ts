import { TradeQuoteError, TransactionExecutionState } from '@shapeshiftoss/swapper'

import type { TradeQuoteSliceState } from './types'
import { HopExecutionState, QuoteSortOption, TradeExecutionState } from './types'

import { TradeQuoteValidationError } from '@/state/apis/swapper/types'

export const initialApprovalExecutionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
  isInitiallyRequired: undefined,
}

export const initialTransactionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
}

const initialProgressState = {
  progress: 0,
  status: 'pending',
} as const

const initialHopState = {
  state: HopExecutionState.Pending,
  allowanceReset: initialApprovalExecutionState,
  allowanceApproval: initialApprovalExecutionState,
  permit2: initialTransactionState,
  swap: initialTransactionState,
  progress: initialProgressState,
}

export const initialTradeExecutionState = {
  state: TradeExecutionState.Initializing,
  firstHop: initialHopState,
  secondHop: initialHopState,
}

export const initialState: TradeQuoteSliceState = {
  isQuotesInitialized: false,
  activeQuoteMeta: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecution: {},
  tradeQuotes: {},
  tradeQuoteDisplayCache: [],
  isTradeQuoteRequestAborted: false,
  sortOption: QuoteSortOption.BEST_RATE,
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
