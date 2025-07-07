import { useMemo } from 'react'

import { assertUnreachable } from '@/lib/utils'
import { LimitOrderSubmissionState } from '@/state/slices/limitOrderSlice/constants'
import {
  selectActiveQuoteId,
  selectLimitOrderSubmissionMetadata,
} from '@/state/slices/limitOrderSlice/selectors'
import type { ApprovalExecutionMetadata } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

enum StepperStep {
  AllowanceReset = 'allowanceReset',
  AllowanceApproval = 'allowanceApproval',
  OrderSubmission = 'orderSubmission',
  PlacementComplete = 'placementComplete',
}

type StepperStepParams = {
  allowanceReset: ApprovalExecutionMetadata
  allowanceApproval: ApprovalExecutionMetadata
  orderSubmissionState: LimitOrderSubmissionState
}

const getStepperSteps = ({ allowanceReset, allowanceApproval }: StepperStepParams) => {
  return {
    [StepperStep.AllowanceReset]: allowanceReset.isInitiallyRequired,
    [StepperStep.AllowanceApproval]: allowanceApproval.isInitiallyRequired,
    [StepperStep.OrderSubmission]: true,
    [StepperStep.PlacementComplete]: true,
  }
}

const countStepperSteps = (params: StepperStepParams) => {
  return Object.values(getStepperSteps(params)).filter(Boolean).length
}

const getCurrentStepperStep = ({ orderSubmissionState }: StepperStepParams) => {
  switch (orderSubmissionState) {
    case LimitOrderSubmissionState.Initializing:
    case LimitOrderSubmissionState.Previewing:
      return undefined
    case LimitOrderSubmissionState.AwaitingAllowanceReset:
      return StepperStep.AllowanceReset
    case LimitOrderSubmissionState.AwaitingAllowanceApproval:
      return StepperStep.AllowanceApproval
    case LimitOrderSubmissionState.Complete:
      return StepperStep.PlacementComplete
    case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
      return StepperStep.OrderSubmission
    default:
      assertUnreachable(orderSubmissionState)
  }
}

const getCurrentStepperStepIndex = (params: StepperStepParams) => {
  const steps = getStepperSteps(params)
  const activeSteps = Object.entries(steps).filter(([_, isActive]) => isActive)
  const currentStep = getCurrentStepperStep(params)

  if (!currentStep)
    return [LimitOrderSubmissionState.Initializing, LimitOrderSubmissionState.Previewing].includes(
      params.orderSubmissionState,
    )
      ? 0
      : activeSteps.length - 1
  return activeSteps.findIndex(([step]) => step === currentStep)
}

export const useStepperSteps = () => {
  const quoteId = useAppSelector(selectActiveQuoteId)

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { cowSwapQuoteId: quoteId ?? 0 }
  }, [quoteId])

  const limitOrderSubmissionMetadata = useSelectorWithArgs(
    selectLimitOrderSubmissionMetadata,
    orderSubmissionMetadataFilter,
  )

  const {
    state: orderSubmissionState,
    allowanceReset,
    allowanceApproval,
  } = useMemo(() => {
    if (!limitOrderSubmissionMetadata)
      return {
        state: LimitOrderSubmissionState.Initializing,
        allowanceReset: undefined,
        allowanceApproval: undefined,
      }
    return limitOrderSubmissionMetadata
  }, [limitOrderSubmissionMetadata])

  const params: StepperStepParams | undefined = useMemo(() => {
    if (!(allowanceReset && allowanceApproval)) return undefined

    return {
      allowanceReset,
      allowanceApproval,
      orderSubmissionState,
    }
  }, [allowanceReset, allowanceApproval, orderSubmissionState])

  const limitOrderSteps = useMemo(() => {
    if (!params) return
    return getStepperSteps(params)
  }, [params])

  const totalSteps = useMemo(() => {
    if (!params) return
    return countStepperSteps(params)
  }, [params])

  const currentLimitOrderStep = useMemo(() => {
    if (!params) return
    return getCurrentStepperStep(params)
  }, [params])

  const currentLimitOrderStepIndex = useMemo(() => {
    if (!params) return
    return getCurrentStepperStepIndex(params)
  }, [params])

  return {
    limitOrderSteps,
    totalSteps,
    currentLimitOrderStep,
    currentLimitOrderStepIndex,
  }
}
