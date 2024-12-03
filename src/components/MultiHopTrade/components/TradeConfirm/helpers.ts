import type { TextPropTypes } from 'components/Text/Text'
import { assertUnreachable } from 'lib/utils'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'

export const getHopExecutionStateButtonTranslation = (hopExecutionState: HopExecutionState) => {
  switch (hopExecutionState) {
    case HopExecutionState.Pending:
      return 'trade.pending'
    case HopExecutionState.AwaitingAllowanceReset:
      return 'common.reset'
    case HopExecutionState.AwaitingAllowanceApproval:
      return 'common.approve'
    case HopExecutionState.AwaitingPermit2:
      return 'trade.permit2.signMessage'
    case HopExecutionState.AwaitingSwap:
      return 'trade.signAndSwap'
    case HopExecutionState.Complete:
      return 'trade.complete'
    default:
      assertUnreachable(hopExecutionState)
  }
}

export const getHopExecutionStateSummaryStepTranslation = (
  hopExecutionState: HopExecutionState,
  swapperName: string,
): TextPropTypes['translation'] | null => {
  switch (hopExecutionState) {
    case HopExecutionState.Pending:
      return null // No summary step for pending state
    case HopExecutionState.AwaitingAllowanceReset:
      return 'trade.awaitingAllowanceReset'
    case HopExecutionState.AwaitingAllowanceApproval:
      return 'trade.awaitingApproval'
    case HopExecutionState.AwaitingPermit2:
      return 'trade.awaitingPermit2Approval'
    case HopExecutionState.AwaitingSwap:
      return ['trade.awaitingSwap', { swapperName }]
    case HopExecutionState.Complete:
      return null // No summary step for complete state
    default:
      assertUnreachable(hopExecutionState)
  }
}
