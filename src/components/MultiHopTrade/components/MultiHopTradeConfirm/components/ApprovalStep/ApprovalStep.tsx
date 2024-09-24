import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { assertUnreachable, isSome } from '@shapeshiftoss/utils'
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
import type { TxLineProps } from './components/SharedApprovalDescription'
import { SharedApprovalDescription } from './components/SharedApprovalDescription'
import { useAllowanceApprovalContent } from './hooks/useAllowanceApprovalContent'
import { useAllowanceResetContent } from './hooks/useAllowanceResetContent'
import { usePermit2Content } from './hooks/usePermit2Content'

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
    permit2,
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

  const { content: permit2Content, description: permit2Description } = usePermit2Content({
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
          // When the reset is complete, there is more for the user to do in this UI component, so
          // the status should be set back to TransactionExecutionState.AwaitingConfirmation.
          return allowanceReset.state === TransactionExecutionState.Complete
            ? TransactionExecutionState.AwaitingConfirmation
            : allowanceReset.state
        case HopExecutionState.AwaitingAllowanceApproval:
          // If this is a Permit2 flow and the approval tx is complete, there is more for the user
          // to do in this UI component, so the status should be set back to
          // TransactionExecutionState.AwaitingConfirmation.
          return permit2.isRequired &&
            allowanceApproval.state === TransactionExecutionState.Complete
            ? TransactionExecutionState.AwaitingConfirmation
            : allowanceApproval.state
        case HopExecutionState.AwaitingPermit2:
          return permit2.state
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return TransactionExecutionState.Complete
        default:
          assertUnreachable(hopExecutionState)
      }

      throw Error('Unhandled hopExecutionState')
    })()

    return <StatusIcon txStatus={txStatus} defaultIcon={defaultIcon} />
  }, [
    allowanceApproval.state,
    allowanceReset.state,
    hopExecutionState,
    permit2.isRequired,
    permit2.state,
  ])

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
          return permit2Content
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return
        default:
          assertUnreachable(hopExecutionState)
      }
    })()

    return inner ? (
      <AnimatePresence mode='wait' initial={false}>
        <SlideTransitionX key={hopExecutionState}>{inner}</SlideTransitionX>
      </AnimatePresence>
    ) : undefined
  }, [allowanceApprovalContent, allowanceResetContent, hopExecutionState, permit2Content])

  const txLines = useMemo(() => {
    const txLines = [
      allowanceReset.txHash && {
        nameTranslation: 'trade.allowanceResetTxName',
        txHash: allowanceReset.txHash,
      },
      allowanceApproval.txHash && {
        nameTranslation: 'trade.allowanceApprovalTxName',
        txHash: allowanceApproval.txHash,
      },
    ].filter(isSome) as Omit<TxLineProps, 'tradeQuoteStep'>[]

    return txLines
  }, [allowanceApproval.txHash, allowanceReset.txHash])

  const description = useMemo(() => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        // Note in the case of allowance resets for USDT, we cannot estimate gas for the approval
        // until the reset is completed otherwise gas estimation fails. It would be nice to show the
        // user an estimate for the approval and the reset, but this simply isn't possible. We might
        // be able to use the reset tx gas limit as a rough estimate though, but that is not
        // implemented here.
        if (allowanceReset.isInitiallyRequired) {
          return allowanceResetDescription
        }

        if (allowanceApproval.isInitiallyRequired) {
          return allowanceApprovalDescription
        }

        return permit2Description

      case HopExecutionState.AwaitingAllowanceReset:
        return allowanceResetDescription
      case HopExecutionState.AwaitingAllowanceApproval:
        return allowanceApprovalDescription
      case HopExecutionState.AwaitingPermit2:
        return permit2Description
      case HopExecutionState.AwaitingSwap:
      case HopExecutionState.Complete:
        return (
          <SharedApprovalDescription
            tradeQuoteStep={tradeQuoteStep}
            isError={allowanceApproval.state === TransactionExecutionState.Failed}
            txLines={txLines}
            errorTranslation='trade.approvalFailed'
          />
        )
      default:
        assertUnreachable(hopExecutionState)
    }
  }, [
    allowanceApproval.isInitiallyRequired,
    allowanceApproval.state,
    allowanceApprovalDescription,
    allowanceReset.isInitiallyRequired,
    allowanceResetDescription,
    hopExecutionState,
    permit2Description,
    tradeQuoteStep,
    txLines,
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
