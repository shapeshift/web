import { Tag } from '@chakra-ui/react'
import type { TxStatus as TxStatusType } from '@shapeshiftoss/unchained-client'
import { TxStatus } from '@shapeshiftoss/unchained-client'

type NotificationStatusTagProps = {
  status: TxStatusType
}

export const NotificationStatusTag = ({ status }: NotificationStatusTagProps) => {
  switch (status) {
    case TxStatus.Confirmed:
      return (
        <Tag size='sm' colorScheme='green'>
          Confirmed
        </Tag>
      )
    case TxStatus.Pending:
      return (
        <Tag size='sm' colorScheme='yellow'>
          Pending
        </Tag>
      )
    case TxStatus.Failed:
      return (
        <Tag size='sm' colorScheme='red'>
          Failed
        </Tag>
      )
    default:
      return (
        <Tag size='sm' colorScheme='gray'>
          Unknown
        </Tag>
      )
  }
}
