import { CheckCircleIcon, CloseIcon } from '@chakra-ui/icons'
import { Circle } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

export const StatusIcon = (props: { txStatus: TxStatus }) => {
  // TODO: proper light/dark mode colors here
  switch (props.txStatus) {
    case TxStatus.Confirmed:
      return (
        <Circle size={8}>
          <CheckCircleIcon color='text.success' />
        </Circle>
      )
    case TxStatus.Failed:
      return (
        <Circle bg='red.500' size={8}>
          <CloseIcon p={1} />
        </Circle>
      )
    // when the trade is submitting, treat unknown status as pending so the spinner spins
    case TxStatus.Pending:
    case TxStatus.Unknown:
    default:
      return (
        <Circle size={8}>
          <CircularProgress size={4} />
        </Circle>
      )
  }
}
