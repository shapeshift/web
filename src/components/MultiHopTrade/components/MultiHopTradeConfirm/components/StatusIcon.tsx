import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Circle } from '@chakra-ui/react'
import { useMemo } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { assertUnreachable } from 'lib/utils'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

export const StatusIcon = ({
  txStatus,
  defaultIcon,
}: {
  txStatus: TransactionExecutionState
  defaultIcon: JSX.Element
}) => {
  switch (txStatus) {
    case TransactionExecutionState.Complete:
      return (
        <Circle size={8}>
          <CheckCircleIcon color='text.success' />
        </Circle>
      )
    case TransactionExecutionState.Failed:
      return (
        <Circle size={8}>
          <WarningIcon color='text.error' />
        </Circle>
      )
    // when the trade is submitting, treat unknown status as pending so the spinner spins
    case TransactionExecutionState.Pending:
      return (
        <Circle size={8}>
          <CircularProgress size={4} />
        </Circle>
      )
    case TransactionExecutionState.AwaitingConfirmation:
      return <Circle size={8}>{defaultIcon}</Circle>
    default:
      assertUnreachable(txStatus)
  }
}

export const ApprovalStatusIcon = ({
  hopExecutionState,
  approvalTxState,
  initialIcon,
  overrideCompletedStateToPending,
}: {
  hopExecutionState: HopExecutionState
  approvalTxState: TransactionExecutionState
  initialIcon: JSX.Element
  overrideCompletedStateToPending?: boolean
}) => {
  const txStatus = useMemo(() => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        return TransactionExecutionState.AwaitingConfirmation
      case HopExecutionState.AwaitingApprovalReset:
      case HopExecutionState.AwaitingApproval:
        // override completed state to pending, isApprovalNeeded dictates this
        if (
          approvalTxState === TransactionExecutionState.Complete &&
          overrideCompletedStateToPending
        ) {
          return TransactionExecutionState.Pending
        }

        return approvalTxState
      // override approvalTxState if external approval triggered app to proceed to next step
      case HopExecutionState.AwaitingSwap:
      case HopExecutionState.Complete:
        return TransactionExecutionState.Complete
      default:
        assertUnreachable(hopExecutionState)
    }
  }, [hopExecutionState, approvalTxState, overrideCompletedStateToPending])
  return <StatusIcon txStatus={txStatus} defaultIcon={initialIcon} />
}
