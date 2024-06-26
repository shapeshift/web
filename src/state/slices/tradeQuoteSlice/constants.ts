import type { TradeQuoteSliceState } from './types'
import { HopExecutionState, TradeExecutionState, TransactionExecutionState } from './types'

const initialTransactionState = {
  state: TransactionExecutionState.AwaitingConfirmation,
}

const initialHopState = {
  state: HopExecutionState.Pending,
  approvalReset: initialTransactionState,
  approval: initialTransactionState,
  swap: initialTransactionState,
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
  tradeExecution: initialTradeExecutionState,
  tradeQuotes: {},
  tradeQuoteDisplayCache: [],
  isTradeQuoteRequestAborted: false,
}
