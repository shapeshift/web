import { WarningTwoIcon } from '@chakra-ui/icons'
import type { CenterProps } from '@chakra-ui/react'
import { Center, CircularProgress } from '@chakra-ui/react'
import { TradeType, TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { FaStickyNote } from 'react-icons/fa'
import { ArrowDownBoldIcon } from 'components/Icons/ArrowDownBold'
import { BadgeCheckIcon } from 'components/Icons/BadgeCheck'
import { SendIcon } from 'components/Icons/SendIcon'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Method } from 'hooks/useTxDetails/useTxDetails'

const IconWrapper: React.FC<CenterProps> = props => (
  <Center borderRadius='full' boxSize='100%' {...props} />
)

export const TransactionTypeIcon = ({ type, status }: { type: string; status: TxStatus }) => {
  if (status === TxStatus.Pending) {
    return (
      <IconWrapper bg='blue.500'>
        <CircularProgress trackColor='whiteAlpha.50' color='white' isIndeterminate />
      </IconWrapper>
    )
  }
  if (status === TxStatus.Failed)
    return (
      <IconWrapper bg='red.500'>
        <WarningTwoIcon />
      </IconWrapper>
    )

  switch (type) {
    case TransferType.Send:
      return (
        <IconWrapper bg='blue.500'>
          <SendIcon />
        </IconWrapper>
      )
    case TransferType.Receive:
      return (
        <IconWrapper bg='green.600'>
          <ArrowDownBoldIcon />
        </IconWrapper>
      )
    case TradeType.Trade:
    case TradeType.Swap:
    case Method.WithdrawNative:
    case Method.DepositRefundNative:
    case Method.LoanRepaymentRefundNative:
      return (
        <IconWrapper bg='purple.500'>
          <SwapIcon />
        </IconWrapper>
      )
    case Method.Approve:
      return (
        <IconWrapper bg='blue.500'>
          <BadgeCheckIcon />
        </IconWrapper>
      )
    default:
      return (
        <IconWrapper bg='gray.700'>
          <FaStickyNote />
        </IconWrapper>
      )
  }
}
