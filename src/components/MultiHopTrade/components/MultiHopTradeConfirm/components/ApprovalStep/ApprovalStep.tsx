import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { FaThumbsUp } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { SlideTransitionX } from 'components/SlideTransitionX'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { StatusIcon } from '../StatusIcon'
import { StepperStep } from '../StepperStep'
import { SharedCompletedApprovalDescription } from './components/SharedApprovalDescription'
import { useAllowanceApprovalContent } from './hooks/useAllowanceApprovalContent'
import { useAllowanceResetContent } from './hooks/useAllowanceResetContent'

export type ApprovalStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isLoading?: boolean
  activeTradeId: TradeQuote['id']
}

const defaultIcon = <FaThumbsUp />

export const ApprovalStep = ({
  tradeQuoteStep,
  hopIndex,
  isLoading,
  activeTradeId,
}: ApprovalStepProps) => {
  const translate = useTranslate()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])
  const {
    state: hopExecutionState,
    allowanceApproval,
    allowanceReset,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const { content: allowanceResetContent, description: allowanceResetDescription } =
    useAllowanceResetContent({
      tradeQuoteStep,
      hopIndex,
      activeTradeId,
    })

  const { content: allowanceApprovalContent, description: allowanceApprovalDescription } =
    useAllowanceApprovalContent({
      tradeQuoteStep,
      hopIndex,
      activeTradeId,
    })

  const stepIndicator = useMemo(() => {
    const txStatus = (() => {
      switch (hopExecutionState) {
        case HopExecutionState.Pending:
          return TransactionExecutionState.AwaitingConfirmation
        case HopExecutionState.AwaitingAllowanceReset:
          return allowanceReset.state
        case HopExecutionState.AwaitingAllowanceApproval:
          return allowanceApproval.state
        case HopExecutionState.AwaitingPermit2:
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return TransactionExecutionState.Complete
        default:
          assertUnreachable(hopExecutionState)
      }

      throw Error('Unhandled hopExecutionState')
    })()

    return <StatusIcon txStatus={txStatus} defaultIcon={defaultIcon} />
  }, [allowanceApproval.state, allowanceReset.state, hopExecutionState])

  const content = useMemo(() => {
    const inner = (() => {
      switch (hopExecutionState) {
        case HopExecutionState.Pending:
          return
        case HopExecutionState.AwaitingAllowanceReset:
          return allowanceResetContent
        case HopExecutionState.AwaitingAllowanceApproval:
          return allowanceApprovalContent
        case HopExecutionState.AwaitingPermit2:
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return
        default:
          assertUnreachable(hopExecutionState)
      }
    })()

    return inner ? (
      <AnimatePresence>
        <SlideTransitionX key={hopExecutionState}>{inner}</SlideTransitionX>
      </AnimatePresence>
    ) : undefined
  }, [allowanceApprovalContent, allowanceResetContent, hopExecutionState])

  const description = useMemo(() => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        // Note in the case of allowance resets for USDT, we cannot estimate gas for the approval
        // until the reset is completed otherwise gas estimation fails. It would be nice to show the
        // user an estimate for the approval and the reset, but this simply isn't possible. We might
        // be able to use the reset tx gas limit as a rough estimate though, but that is not
        // implemented here.
        return allowanceReset.isInitiallyRequired
          ? allowanceResetDescription
          : allowanceApprovalDescription
      case HopExecutionState.AwaitingAllowanceReset:
        return allowanceResetDescription
      case HopExecutionState.AwaitingAllowanceApproval:
        return allowanceApprovalDescription
      case HopExecutionState.AwaitingPermit2:
      case HopExecutionState.AwaitingSwap:
      case HopExecutionState.Complete:
        return (
          <SharedCompletedApprovalDescription
            tradeQuoteStep={tradeQuoteStep}
            isError={allowanceApproval.state === TransactionExecutionState.Failed}
            txHash={allowanceApproval.txHash ?? ''}
            errorTranslation='trade.approvalFailed'
          />
        )
      default:
        assertUnreachable(hopExecutionState)
    }
  }, [
    allowanceApproval.state,
    allowanceApproval.txHash,
    allowanceApprovalDescription,
    allowanceReset.isInitiallyRequired,
    allowanceResetDescription,
    hopExecutionState,
    tradeQuoteStep,
  ])

  return (
    <StepperStep
      title={translate('trade.allowance')}
      stepIndicator={stepIndicator}
      content={content}
      description={description}
      isLastStep={false}
      isLoading={isLoading}
      isError={allowanceApproval.state === TransactionExecutionState.Failed}
      isPending={
        (hopExecutionState === HopExecutionState.AwaitingAllowanceApproval &&
          allowanceApproval.state === TransactionExecutionState.AwaitingConfirmation) ||
        (hopExecutionState === HopExecutionState.AwaitingAllowanceReset &&
          allowanceReset.state === TransactionExecutionState.AwaitingConfirmation)
      }
    />
  )
}
