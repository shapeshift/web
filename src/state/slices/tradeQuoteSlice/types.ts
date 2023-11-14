// NOTE: order here matters, and the values must be numeric.
export enum MultiHopExecutionStatus {
  Unknown = 0,
  Previewing = 1,
  Hop1AwaitingApprovalConfirmation = 2,
  Hop1AwaitingApprovalExecution = 3,
  Hop1AwaitingTradeConfirmation = 4,
  Hop1AwaitingTradeExecution = 5,
  Hop2AwaitingApprovalConfirmation = 6,
  Hop2AwaitingApprovalExecution = 7,
  Hop2AwaitingTradeConfirmation = 8,
  Hop2AwaitingTradeExecution = 9,
  TradeComplete = 10,
}
