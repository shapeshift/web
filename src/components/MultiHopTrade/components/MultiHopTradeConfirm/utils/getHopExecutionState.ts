import { assertUnreachable } from 'lib/utils'
import { HopExecutionState, MultiHopExecutionState } from 'state/slices/tradeQuoteSlice/types'

const getHop1ExecutionState = (tradeExecutionState: MultiHopExecutionState) => {
  switch (tradeExecutionState) {
    case MultiHopExecutionState.Unknown:
    case MultiHopExecutionState.Previewing:
      return HopExecutionState.Pending
    case MultiHopExecutionState.Hop1AwaitingApprovalConfirmation:
      return HopExecutionState.AwaitingApprovalConfirmation
    case MultiHopExecutionState.Hop1AwaitingApprovalExecution:
      return HopExecutionState.AwaitingApprovalExecution
    case MultiHopExecutionState.Hop1AwaitingTradeConfirmation:
      return HopExecutionState.AwaitingTradeConfirmation
    case MultiHopExecutionState.Hop1AwaitingTradeExecution:
      return HopExecutionState.AwaitingTradeExecution
    case MultiHopExecutionState.Hop2AwaitingApprovalConfirmation:
    case MultiHopExecutionState.Hop2AwaitingApprovalExecution:
    case MultiHopExecutionState.Hop2AwaitingTradeConfirmation:
    case MultiHopExecutionState.Hop2AwaitingTradeExecution:
    case MultiHopExecutionState.TradeComplete:
      return HopExecutionState.Complete
    default:
      assertUnreachable(tradeExecutionState)
  }
}

const getHop2ExecutionState = (tradeExecutionState: MultiHopExecutionState) => {
  switch (tradeExecutionState) {
    case MultiHopExecutionState.Unknown:
    case MultiHopExecutionState.Previewing:
    case MultiHopExecutionState.Hop1AwaitingApprovalConfirmation:
    case MultiHopExecutionState.Hop1AwaitingApprovalExecution:
    case MultiHopExecutionState.Hop1AwaitingTradeConfirmation:
    case MultiHopExecutionState.Hop1AwaitingTradeExecution:
      return HopExecutionState.Pending
    case MultiHopExecutionState.Hop2AwaitingApprovalConfirmation:
      return HopExecutionState.AwaitingApprovalConfirmation
    case MultiHopExecutionState.Hop2AwaitingApprovalExecution:
      return HopExecutionState.AwaitingApprovalExecution
    case MultiHopExecutionState.Hop2AwaitingTradeConfirmation:
      return HopExecutionState.AwaitingTradeConfirmation
    case MultiHopExecutionState.Hop2AwaitingTradeExecution:
      return HopExecutionState.AwaitingTradeExecution
    case MultiHopExecutionState.TradeComplete:
      return HopExecutionState.Complete
    default:
      assertUnreachable(tradeExecutionState)
  }
}

export const getHopExecutionState = (
  tradeExecutionState: MultiHopExecutionState,
  hopIndex: number,
) => {
  switch (hopIndex) {
    case 0:
      return getHop1ExecutionState(tradeExecutionState)
    case 1:
      return getHop2ExecutionState(tradeExecutionState)
    default:
      // if we reach here something is seriously broken
      throw Error(`invalid hopIndex ${hopIndex}`)
  }
}
