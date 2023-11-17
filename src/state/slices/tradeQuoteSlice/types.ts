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
  Unknown = 'Unknown',
  Previewing = 'Previewing',
  Hop1AwaitingApprovalConfirmation = `Hop1_${HopExecutionState.AwaitingApprovalConfirmation}`,
  Hop1AwaitingApprovalExecution = `Hop1_${HopExecutionState.AwaitingApprovalExecution}`,
  Hop1AwaitingTradeConfirmation = `Hop1_${HopExecutionState.AwaitingTradeConfirmation}`,
  Hop1AwaitingTradeExecution = `Hop1_${HopExecutionState.AwaitingTradeExecution}`,
  Hop2AwaitingApprovalConfirmation = `Hop2_${HopExecutionState.AwaitingApprovalConfirmation}`,
  Hop2AwaitingApprovalExecution = `Hop2_${HopExecutionState.AwaitingApprovalExecution}`,
  Hop2AwaitingTradeConfirmation = `Hop2_${HopExecutionState.AwaitingTradeConfirmation}`,
  Hop2AwaitingTradeExecution = `Hop2_${HopExecutionState.AwaitingTradeExecution}`,
  TradeComplete = 'Complete',
}

export const MULTI_HOP_EXECUTION_STATE_ORDERED = [
  MultiHopExecutionState.Unknown,
  MultiHopExecutionState.Previewing,
  MultiHopExecutionState.Hop1AwaitingApprovalConfirmation,
  MultiHopExecutionState.Hop1AwaitingApprovalExecution,
  MultiHopExecutionState.Hop1AwaitingTradeConfirmation,
  MultiHopExecutionState.Hop1AwaitingTradeExecution,
  MultiHopExecutionState.Hop2AwaitingApprovalConfirmation,
  MultiHopExecutionState.Hop2AwaitingApprovalExecution,
  MultiHopExecutionState.Hop2AwaitingTradeConfirmation,
  MultiHopExecutionState.Hop2AwaitingTradeExecution,
  MultiHopExecutionState.TradeComplete,
]
