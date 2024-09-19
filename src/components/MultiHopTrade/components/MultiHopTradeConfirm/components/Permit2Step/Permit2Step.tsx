import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { FaThumbsUp } from 'react-icons/fa'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { ErrorMsg } from '../SharedApprovalStep/components/SharedApprovalDescription'
import { SharedApprovalStepComplete } from '../SharedApprovalStep/components/SharedApprovalStepComplete'
import { StatusIcon } from '../StatusIcon'
import { Permit2StepPending } from './components/Permit2StepPending'

export type Permit2StepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isLoading?: boolean
  activeTradeId: TradeQuote['id']
}

const defaultIcon = <FaThumbsUp />

export const Permit2Step = ({
  tradeQuoteStep,
  hopIndex,
  isLoading,
  activeTradeId,
}: Permit2StepProps) => {
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])
  const { state: hopExecutionState, permit2 } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const stepIndicator = useMemo(() => {
    const txStatus = (() => {
      switch (hopExecutionState) {
        case HopExecutionState.Pending:
        case HopExecutionState.AwaitingApprovalReset:
        case HopExecutionState.AwaitingApproval:
          return TransactionExecutionState.AwaitingConfirmation
        case HopExecutionState.AwaitingPermit2:
          return permit2.state === TransactionExecutionState.Failed
            ? TransactionExecutionState.Failed
            : TransactionExecutionState.Pending
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return TransactionExecutionState.Complete
        default:
          assertUnreachable(hopExecutionState)
      }
    })()

    return <StatusIcon txStatus={txStatus} defaultIcon={defaultIcon} />
  }, [hopExecutionState, permit2.state])

  const completedDescription = useMemo(() => {
    return (
      <ErrorMsg
        isError={permit2.state === TransactionExecutionState.Failed}
        errorTranslation={'trade.permit2.error'}
      />
    )
  }, [permit2.state])

  const isComplete = useMemo(() => {
    return [HopExecutionState.AwaitingSwap, HopExecutionState.Complete].includes(hopExecutionState)
  }, [hopExecutionState])

  // separate component for completed states to simplify hook dismount
  return isComplete ? (
    <SharedApprovalStepComplete
      titleTranslation={'trade.permit2.title'}
      isLoading={isLoading}
      transactionExecutionState={permit2.state}
      description={completedDescription}
      stepIndicator={stepIndicator}
    />
  ) : (
    <Permit2StepPending
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isLoading={isLoading}
      activeTradeId={activeTradeId}
      stepIndicator={stepIndicator}
      hopExecutionState={hopExecutionState}
      transactionExecutionState={permit2.state}
    />
  )
}
