export enum TransactionExecutionState {
  AwaitingConfirmation = 'AwaitingConfirmation',
  Pending = 'Pending',
  Complete = 'Complete',
  Failed = 'Failed',
}

export enum HopExecutionState {
  Pending = 'Pending',
  AwaitingApproval = 'AwaitingApproval',
  AwaitingSwap = 'AwaitingSwap',
  Complete = 'Complete',
}

export enum TradeExecutionState {
  Initializing = 'Initializing',
  Previewing = 'Previewing',
  FirstHop = 'FirstHop',
  SecondHop = 'SecondHop',
  TradeComplete = 'Complete',
}

export const HOP_EXECUTION_STATE_ORDERED = [
  HopExecutionState.Pending,
  HopExecutionState.AwaitingApproval,
  HopExecutionState.AwaitingSwap,
  HopExecutionState.Complete,
]

export type StreamingSwapFailedSwap = {
  reason: string
  swapIndex: number
}

export type StreamingSwapMetadata = {
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
}

export type ApprovalExecutionMetadata = {
  state: TransactionExecutionState
  txHash?: string
  isRequired?: boolean
}

export type SwapExecutionMetadata = {
  state: TransactionExecutionState
  sellTxHash?: string
  buyTxHash?: string
  streamingSwap?: StreamingSwapMetadata
  message?: string
}

export type HopExecutionMetadata = {
  state: HopExecutionState
  approval: ApprovalExecutionMetadata
  swap: SwapExecutionMetadata
}

export type TradeExecutionMetadata = {
  state: TradeExecutionState
  firstHop: HopExecutionMetadata
  secondHop: HopExecutionMetadata
}
