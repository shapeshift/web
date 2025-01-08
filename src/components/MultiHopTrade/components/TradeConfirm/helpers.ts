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
    case HopExecutionState.AwaitingPermit2Eip712Sign:
      return 'trade.permit2Eip712.signMessage'
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
    case HopExecutionState.AwaitingPermit2Eip712Sign:
      return 'trade.awaitingPermit2Approval'
    case HopExecutionState.AwaitingSwap:
      return ['trade.awaitingSwap', { swapperName }]
    case HopExecutionState.Complete:
      return 'trade.complete'
    default:
      assertUnreachable(hopExecutionState)
  }
}

type StepperStepParams = {
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

export enum StepperStep {
  FirstHopReset = 'firstHopReset',
  FirstHopPermit2Sign = 'firstHopPermit2Sign',
  FirstHopApproval = 'firstHopApproval',
  FirstHopSwap = 'firstHopSwap',
  LastHopReset = 'lastHopReset',
  LastHopApproval = 'lastHopApproval',
  LastHopSwap = 'lastHopSwap',
  TradeComplete = 'tradeComplete',
}

export const getStepperSteps = (params: StepperStepParams): Record<StepperStep, boolean> => {
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
    [StepperStep.FirstHopReset]:
      firstHopAllowanceReset.isRequired === true || firstHopAllowanceReset.txHash !== undefined,
    [StepperStep.FirstHopApproval]:
      firstHopAllowanceApproval.isInitiallyRequired === true ||
      firstHopAllowanceApproval.txHash !== undefined,
    [StepperStep.FirstHopPermit2Sign]: firstHopPermit2.isRequired === true,
    [StepperStep.FirstHopSwap]: true,
    [StepperStep.LastHopReset]:
      isMultiHopTrade === true &&
      (lastHopAllowanceReset.isRequired === true || lastHopAllowanceReset.txHash !== undefined),
    [StepperStep.LastHopApproval]:
      isMultiHopTrade === true &&
      (lastHopAllowanceApproval.isInitiallyRequired === true ||
        lastHopPermit2.isRequired === true ||
        lastHopAllowanceApproval.txHash !== undefined ||
        lastHopPermit2.permit2Signature !== undefined),
    [StepperStep.LastHopSwap]: isMultiHopTrade === true,
    [StepperStep.TradeComplete]: true,
  }
}

export const countStepperSteps = (params: StepperStepParams): number => {
  return Object.values(getStepperSteps(params)).filter(Boolean).length
}

const isInApprovalState = (state: HopExecutionState): boolean => {
  return [HopExecutionState.AwaitingAllowanceApproval].includes(state)
}

const isInPermit2SignState = (state: HopExecutionState): boolean => {
  return [HopExecutionState.AwaitingPermit2Eip712Sign].includes(state)
}

export const getCurrentStepperStep = (
  currentHopIndex: number,
  hopExecutionState: HopExecutionState,
): StepperStep | undefined => {
  if (hopExecutionState === HopExecutionState.Complete) return StepperStep.TradeComplete
  if (hopExecutionState === HopExecutionState.Pending) return undefined

  if (currentHopIndex === 0) {
    if (hopExecutionState === HopExecutionState.AwaitingAllowanceReset)
      return StepperStep.FirstHopReset
    if (isInApprovalState(hopExecutionState)) return StepperStep.FirstHopApproval
    if (isInPermit2SignState(hopExecutionState)) return StepperStep.FirstHopPermit2Sign
    if (hopExecutionState === HopExecutionState.AwaitingSwap) return StepperStep.FirstHopSwap
  } else if (currentHopIndex === 1) {
    if (hopExecutionState === HopExecutionState.AwaitingAllowanceReset)
      return StepperStep.LastHopReset
    if (isInApprovalState(hopExecutionState)) return StepperStep.LastHopApproval
    if (hopExecutionState === HopExecutionState.AwaitingSwap) return StepperStep.LastHopSwap
  }
}

export const getCurrentStepperStepIndex = (
  params: StepperStepParams & {
    currentHopIndex: number
    hopExecutionState: HopExecutionState
  },
): number => {
  const steps = getStepperSteps(params)
  const activeSteps = Object.entries(steps).filter(([_, isActive]) => isActive)
  const currentStep = getCurrentStepperStep(params.currentHopIndex, params.hopExecutionState)

  if (!currentStep)
    return params.hopExecutionState === HopExecutionState.Pending ? 0 : activeSteps.length - 1
  return activeSteps.findIndex(([step]) => step === currentStep)
}
