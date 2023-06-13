export enum MultiHopExecutionStatus {
  TradeFailed = 0,
  Hop1AwaitingApprovalConfirmation = 1,
  Hop1AwaitingApprovalExecution = 2,
  Hop1AwaitingTradeConfirmation = 3,
  Hop1AwaitingTradeExecution = 4,
  Hop2AwaitingApprovalConfirmation = 5,
  Hop2AwaitingApprovalExecution = 6,
  Hop2AwaitingTradeConfirmation = 7,
  Hop2AwaitingTradeExecution = 8,
  TradeComplete = 9,
  TradeCancelled = 10,
}

export type StepperStep = {
  title: string
  description?: string
  stepIndicator: JSX.Element
  content?: JSX.Element
  status?: MultiHopExecutionStatus
}
