import type { CenterProps } from '@chakra-ui/react'
import { Center, CircularProgress } from '@chakra-ui/react'
import { TradeType, TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { ArrowDownBoldIcon } from 'components/Icons/ArrowDownBold'
import { BadgeCheckIcon } from 'components/Icons/BadgeCheck'
import { ErrorIcon } from 'components/Icons/ErrorIcon'
import { GenericTxIcon } from 'components/Icons/GenericTx'
import { SendIcon } from 'components/Icons/SendIcon'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { Method } from 'hooks/useTxDetails/useTxDetails'

const IconWrapper: React.FC<CenterProps> = props => (
  <Center borderRadius='full' boxSize='100%' {...props} />
)

export const TransactionTypeIcon = ({ type, status }: { type: string; status: TxStatus }) => {
  if (status === TxStatus.Pending) {
    return (
      <IconWrapper bg='border.base'>
        <CircularProgress
          size='0.85em'
          thickness='1.25em'
          trackColor='border.base'
          color='blue.500'
          isIndeterminate
        />
      </IconWrapper>
    )
  }
  if (status === TxStatus.Failed)
    return (
      <IconWrapper bg='red.500'>
        <ErrorIcon />
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
          <SwapBoldIcon />
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
        <IconWrapper bg='blue.500'>
          <GenericTxIcon />
        </IconWrapper>
      )
  }
}
