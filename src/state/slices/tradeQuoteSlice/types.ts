import type { TxStatus } from '@shapeshiftoss/unchained-client'

export enum HopExecutionState {
  Pending = 'Pending',
  AwaitingApprovalConfirmation = 'AwaitingApprovalConfirmation',
  AwaitingApprovalExecution = 'AwaitingApprovalExecution',
  AwaitingTradeConfirmation = 'AwaitingTradeConfirmation',
  AwaitingTradeExecution = 'AwaitingTradeExecution',
  Complete = 'Complete',
}

export const HOP_EXECUTION_STATE_ORDERED = [
  HopExecutionState.Pending,
  HopExecutionState.AwaitingApprovalConfirmation,
  HopExecutionState.AwaitingApprovalExecution,
  HopExecutionState.AwaitingTradeConfirmation,
  HopExecutionState.AwaitingTradeExecution,
  HopExecutionState.Complete,
]

export enum MultiHopExecutionState {
  Previewing = 'Previewing',
  FirstHopAwaitingApprovalConfirmation = `firstHop_${HopExecutionState.AwaitingApprovalConfirmation}`,
  FirstHopAwaitingApprovalExecution = `firstHop_${HopExecutionState.AwaitingApprovalExecution}`,
  FirstHopAwaitingTradeConfirmation = `firstHop_${HopExecutionState.AwaitingTradeConfirmation}`,
  FirstHopAwaitingTradeExecution = `firstHop_${HopExecutionState.AwaitingTradeExecution}`,
  SecondHopAwaitingApprovalConfirmation = `secondHop_${HopExecutionState.AwaitingApprovalConfirmation}`,
  SecondHopAwaitingApprovalExecution = `secondHop_${HopExecutionState.AwaitingApprovalExecution}`,
  SecondHopAwaitingTradeConfirmation = `secondHop_${HopExecutionState.AwaitingTradeConfirmation}`,
  SeondHopAwaitingTradeExecution = `secondHop_${HopExecutionState.AwaitingTradeExecution}`,
  TradeComplete = 'Complete',
}

export const MULTI_HOP_EXECUTION_STATE_ORDERED = [
  MultiHopExecutionState.Previewing,
  MultiHopExecutionState.FirstHopAwaitingApprovalConfirmation,
  MultiHopExecutionState.FirstHopAwaitingApprovalExecution,
  MultiHopExecutionState.FirstHopAwaitingTradeConfirmation,
  MultiHopExecutionState.FirstHopAwaitingTradeExecution,
  MultiHopExecutionState.SecondHopAwaitingApprovalConfirmation,
  MultiHopExecutionState.SecondHopAwaitingApprovalExecution,
  MultiHopExecutionState.SecondHopAwaitingTradeConfirmation,
  MultiHopExecutionState.SeondHopAwaitingTradeExecution,
  MultiHopExecutionState.TradeComplete,
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

export type HopExecutionMetadata = {
  state: HopExecutionState
  approvalRequired?: boolean
  approvalState?: TxStatus
  approvalTxHash?: string
  swapState?: TxStatus
  swapSellTxHash?: string
  swapBuyTxHash?: string
  streamingSwap?: StreamingSwapMetadata
}
