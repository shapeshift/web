export enum MultiHopExecutionStatus {
  TradeFailed,
  Hop1AwaitingApprovalConfirmation,
  Hop1AwaitingApprovalExecution,
  Hop1AwaitingTradeConfirmation,
  Hop1AwaitingTradeExecution,
  Hop2AwaitingApprovalConfirmation,
  Hop2AwaitingApprovalExecution,
  Hop2AwaitingTradeConfirmation,
  Hop2AwaitingTradeExecution,
  TradeComplete,
  TradeCancelled,
}

export type StepperStep = {
  title: string
  description?: string
  stepIndicator: JSX.Element
  content?: JSX.Element
  status?: MultiHopExecutionStatus
}
