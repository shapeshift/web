import type { TagProps } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/react'

import { NotificationStatus } from '../types'

type NotificationStatusTagProps = {
  status: NotificationStatus
}

const defaultTagProps: TagProps = {
  px: 1.5,
  py: 0,
  minWidth: 'auto',
  fontWeight: 'medium',
  lineHeight: 1,
}

export const NotificationStatusTag = ({ status }: NotificationStatusTagProps) => {
  switch (status) {
    case NotificationStatus.Open:
      return (
        <Tag size='sm' colorScheme='blue' {...defaultTagProps}>
          Open
        </Tag>
      )
    case NotificationStatus.Expired:
      return (
        <Tag size='sm' colorScheme='red' {...defaultTagProps}>
          Expired
        </Tag>
      )
    case NotificationStatus.Cancelled:
      return (
        <Tag size='sm' colorScheme='red' {...defaultTagProps}>
          Cancelled
        </Tag>
      )
    case NotificationStatus.Complete:
      return (
        <Tag size='sm' colorScheme='green' {...defaultTagProps}>
          Confirmed
        </Tag>
      )
    case NotificationStatus.Pending:
      return (
        <Tag size='sm' colorScheme='yellow' {...defaultTagProps}>
          Pending
        </Tag>
      )
    case NotificationStatus.Failed:
      return (
        <Tag size='sm' colorScheme='red' {...defaultTagProps}>
          Failed
        </Tag>
      )
    case NotificationStatus.ClaimAvailable:
      return (
        <Tag size='sm' colorScheme='blue' {...defaultTagProps}>
          Claim Available
        </Tag>
      )
    default:
      return (
        <Tag size='sm' colorScheme='gray' {...defaultTagProps}>
          Unknown
        </Tag>
      )
  }
}
