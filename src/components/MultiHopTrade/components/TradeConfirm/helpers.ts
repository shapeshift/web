import type { TextPropTypes } from 'components/Text/Text'
import { assertUnreachable } from 'lib/utils'
import type { ApprovalExecutionMetadata } from 'state/slices/tradeQuoteSlice/types'
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

type TradeStepParams = {
  firstHopAllowanceApproval: ApprovalExecutionMetadata
  firstHopPermit2: Omit<ApprovalExecutionMetadata, 'txHash' | 'isInitiallyRequired'> & {
    permit2Signature?: string | undefined
  }
  firstHopAllowanceReset: ApprovalExecutionMetadata
  lastHopAllowanceApproval: ApprovalExecutionMetadata
  lastHopPermit2: Omit<ApprovalExecutionMetadata, 'txHash' | 'isInitiallyRequired'> & {
    permit2Signature?: string | undefined
  }
  lastHopAllowanceReset: ApprovalExecutionMetadata
  isMultiHopTrade?: boolean
}

const getTradeSteps = (params: TradeStepParams): boolean[] => [
  // First hop allowance reset (if needed)
  params.firstHopAllowanceReset.isRequired === true,
  // First hop approval/permit2
  params.firstHopAllowanceApproval.isInitiallyRequired === true ||
    params.firstHopPermit2.isRequired === true,
  // First hop action
  true,
  // Last hop allowance reset (if needed and multiHop)
  params.isMultiHopTrade === true && params.lastHopAllowanceApproval.isInitiallyRequired === true,
  // Last hop approval/permit2 (if multiHop)
  params.isMultiHopTrade === true &&
    (params.lastHopAllowanceApproval.isInitiallyRequired === true ||
      params.lastHopPermit2.isRequired === true),
  // Last hop action (if multiHop)
  params.isMultiHopTrade === true,
]

export const countTradeSteps = (params: TradeStepParams): number => {
  return getTradeSteps(params).filter(Boolean).length
}

const isInApprovalState = (state: HopExecutionState): boolean => {
  return [HopExecutionState.AwaitingAllowanceApproval, HopExecutionState.AwaitingPermit2].includes(
    state,
  )
}

export const getCurrentStep = (
  params: TradeStepParams & {
    currentHopIndex: number
    hopExecutionState: HopExecutionState
  },
): number => {
  const activeSteps = getTradeSteps(params).filter(Boolean)

  // Handle pending state
  if (params.hopExecutionState === HopExecutionState.Pending) return 0

  // First hop reset state
  if (
    params.currentHopIndex === 0 &&
    params.hopExecutionState === HopExecutionState.AwaitingAllowanceReset
  )
    return 0

  // First hop approval states
  if (params.currentHopIndex === 0 && isInApprovalState(params.hopExecutionState)) return 1

  // First hop swap state
  if (params.currentHopIndex === 0 && params.hopExecutionState === HopExecutionState.AwaitingSwap) {
    return params.firstHopAllowanceApproval.isInitiallyRequired ? 2 : 0
  }

  // Second hop reset state
  if (
    params.currentHopIndex === 1 &&
    params.hopExecutionState === HopExecutionState.AwaitingAllowanceReset
  ) {
    return activeSteps.length - 3
  }

  // Second hop approval states
  if (params.currentHopIndex === 1 && isInApprovalState(params.hopExecutionState)) {
    return activeSteps.length - 2
  }

  // Second hop swap state or complete
  return activeSteps.length - 1
}
