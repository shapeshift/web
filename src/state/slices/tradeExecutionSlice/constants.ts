import { TradeQuoteError } from '@shapeshiftoss/swapper'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'

import type { TradeExecutionSliceState } from './types'
import { HopExecutionState, TradeExecutionState, TransactionExecutionState } from './types'

export const initialApprovalExecutionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
  isInitiallyRequired: false,
}

export const initialTransactionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
}

const initialHopState = {
  state: HopExecutionState.Pending,
  allowanceReset: initialApprovalExecutionState,
  allowanceApproval: initialApprovalExecutionState,
  permit2: initialTransactionState,
  swap: initialTransactionState,
}

export const initialTradeExecutionState = {
  state: TradeExecutionState.Initializing,
  firstHop: initialHopState,
  secondHop: initialHopState,
}

export const initialState: TradeExecutionSliceState = {
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecution: {},
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
