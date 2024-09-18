import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Circle } from '@chakra-ui/react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { assertUnreachable } from 'lib/utils'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

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
