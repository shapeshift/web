import type {
  HopExecutionState,
  TransactionExecutionState,
} from 'state/slices/tradeQuoteSlice/types'

export type RenderAllowanceContentCallbackParams = {
  hopExecutionState: HopExecutionState
  transactionExecutionState: TransactionExecutionState
  isAllowanceApprovalLoading: boolean
  handleSignAllowanceApproval: () => Promise<void>
}

export type RenderAllowanceContentCallback = (
  params: RenderAllowanceContentCallbackParams,
) => JSX.Element | undefined
