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
      return 'trade.doAnotherTrade'
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
      return 'trade.complete'
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

export enum TradeStep {
  FirstHopReset = 'firstHopReset',
  FirstHopApproval = 'firstHopApproval',
  FirstHopSwap = 'firstHopSwap',
  LastHopReset = 'lastHopReset',
  LastHopApproval = 'lastHopApproval',
  LastHopSwap = 'lastHopSwap',
  TradeComplete = 'tradeComplete',
}

export const getTradeSteps = (params: TradeStepParams): Record<TradeStep, boolean> => {
  const {
    firstHopAllowanceReset,
    firstHopAllowanceApproval,
    firstHopPermit2,
    lastHopAllowanceReset,
    lastHopAllowanceApproval,
    lastHopPermit2,
    isMultiHopTrade,
  } = params
  return {
    [TradeStep.FirstHopReset]:
      firstHopAllowanceReset.isRequired === true || firstHopAllowanceReset.txHash !== undefined,
    [TradeStep.FirstHopApproval]:
      firstHopAllowanceApproval.isInitiallyRequired === true ||
      firstHopPermit2.isRequired === true ||
      firstHopAllowanceApproval.txHash !== undefined ||
      firstHopPermit2.permit2Signature !== undefined,
    [TradeStep.FirstHopSwap]: true,
    [TradeStep.LastHopReset]:
      isMultiHopTrade === true &&
      (lastHopAllowanceReset.isRequired === true || lastHopAllowanceReset.txHash !== undefined),
    [TradeStep.LastHopApproval]:
      isMultiHopTrade === true &&
      (lastHopAllowanceApproval.isInitiallyRequired === true ||
        lastHopPermit2.isRequired === true ||
        lastHopAllowanceApproval.txHash !== undefined ||
        lastHopPermit2.permit2Signature !== undefined),
    [TradeStep.LastHopSwap]: isMultiHopTrade === true,
    [TradeStep.TradeComplete]: true,
  }
}

export const countTradeSteps = (params: TradeStepParams): number => {
  return Object.values(getTradeSteps(params)).filter(Boolean).length
}

const isInApprovalState = (state: HopExecutionState): boolean => {
  return [HopExecutionState.AwaitingAllowanceApproval, HopExecutionState.AwaitingPermit2].includes(
    state,
  )
}

export const getCurrentTradeStep = (
  currentHopIndex: number,
  hopExecutionState: HopExecutionState,
): TradeStep | undefined => {
  if (hopExecutionState === HopExecutionState.Complete) return TradeStep.TradeComplete
  if (hopExecutionState === HopExecutionState.Pending) return undefined

  if (currentHopIndex === 0) {
    if (hopExecutionState === HopExecutionState.AwaitingAllowanceReset)
      return TradeStep.FirstHopReset
    if (isInApprovalState(hopExecutionState)) return TradeStep.FirstHopApproval
    if (hopExecutionState === HopExecutionState.AwaitingSwap) return TradeStep.FirstHopSwap
  } else if (currentHopIndex === 1) {
    if (hopExecutionState === HopExecutionState.AwaitingAllowanceReset)
      return TradeStep.LastHopReset
    if (isInApprovalState(hopExecutionState)) return TradeStep.LastHopApproval
    if (hopExecutionState === HopExecutionState.AwaitingSwap) return TradeStep.LastHopSwap
  }
}

export const getCurrentTradeStepIndex = (
  params: TradeStepParams & {
    currentHopIndex: number
    hopExecutionState: HopExecutionState
  },
): number => {
  const steps = getTradeSteps(params)
  const activeSteps = Object.entries(steps).filter(([_, isActive]) => isActive)
  const currentStep = getCurrentTradeStep(params.currentHopIndex, params.hopExecutionState)

  if (!currentStep)
    return params.hopExecutionState === HopExecutionState.Pending ? 0 : activeSteps.length - 1
  return activeSteps.findIndex(([step]) => step === currentStep)
}
