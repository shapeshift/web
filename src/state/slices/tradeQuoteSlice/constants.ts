import { TradeQuoteError } from '@shapeshiftoss/swapper'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'

import type { TradeQuoteSliceState } from './types'
import { HopExecutionState, TradeExecutionState, TransactionExecutionState } from './types'

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
  activeQuoteMeta: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecution: {},
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
