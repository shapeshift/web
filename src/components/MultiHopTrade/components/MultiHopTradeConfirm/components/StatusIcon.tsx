import { CloseIcon } from '@chakra-ui/icons'
import { Circle, Spinner } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { JuicyGreenCheck } from './JuicyGreenCheck'

export const StatusIcon = (props: { txStatus: TxStatus }) => {
  // TODO: proper light/dark mode colors here
  switch (props.txStatus) {
    case TxStatus.Confirmed:
      return <JuicyGreenCheck />
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
        <Circle bg='gray.750' size={8}>
          <Spinner />
        </Circle>
      )
  }
}
