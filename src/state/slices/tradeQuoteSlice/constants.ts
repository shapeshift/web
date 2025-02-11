import { TradeQuoteError } from '@shapeshiftoss/swapper'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'

import type { HopExecutionMetadata, TradeQuoteSliceState } from './types'
import { HopExecutionState, TradeExecutionState, TransactionExecutionState } from './types'

export const initialApprovalExecutionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
  isInitiallyRequired: undefined,
}

export const initialTransactionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
}

const initialHopExecutionState: HopExecutionMetadata = {
  state: HopExecutionState.Pending,
  allowanceReset: {
    state: TransactionExecutionState.AwaitingConfirmation,
    isInitiallyRequired: undefined,
  },
  allowanceApproval: {
    state: TransactionExecutionState.AwaitingConfirmation,
    isInitiallyRequired: undefined,
  },
  permit2: {
    state: TransactionExecutionState.AwaitingConfirmation,
    isRequired: false,
  },
  swap: {
    state: TransactionExecutionState.AwaitingConfirmation,
  },
  progress: {
    progress: 0,
    status: 'default',
  },
}

export const initialTradeExecutionState = {
  state: TradeExecutionState.Initializing,
  firstHop: initialHopExecutionState,
  secondHop: initialHopExecutionState,
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
