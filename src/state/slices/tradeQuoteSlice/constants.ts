import type { TradeQuoteSliceState } from './tradeQuoteSlice'
import { HopExecutionState, TradeExecutionState, TransactionExecutionState } from './types'

const initialTransactionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
}

const initialHopState = {
  state: HopExecutionState.Pending,
  approval: initialTransactionState,
  swap: initialTransactionState,
}

export const initialTradeExecutionState = {
  state: TradeExecutionState.Previewing,
  firstHop: initialHopState,
  secondHop: initialHopState,
}

export const initialState: TradeQuoteSliceState = {
  activeQuoteIndex: undefined,
  confirmedQuote: undefined,
  activeStep: undefined,
  tradeExecution: initialTradeExecutionState,
}
