import type { TagProps } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

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
  const translate = useTranslate()
  switch (status) {
    case NotificationStatus.Open:
      return (
        <Tag size='sm' colorScheme='blue' {...defaultTagProps}>
          {translate('notificationCenter.status.open')}
        </Tag>
      )
    case NotificationStatus.Expired:
      return (
        <Tag size='sm' colorScheme='red' {...defaultTagProps}>
          {translate('notificationCenter.status.expired')}
        </Tag>
      )
    case NotificationStatus.Cancelled:
      return (
        <Tag size='sm' colorScheme='red' {...defaultTagProps}>
          {translate('notificationCenter.status.cancelled')}
        </Tag>
      )
    case NotificationStatus.Complete:
      return (
        <Tag size='sm' colorScheme='green' {...defaultTagProps}>
          {translate('notificationCenter.status.confirmed')}
        </Tag>
      )
    case NotificationStatus.Pending:
      return (
        <Tag size='sm' colorScheme='yellow' {...defaultTagProps}>
          {translate('notificationCenter.status.pending')}
        </Tag>
      )
    case NotificationStatus.Failed:
      return (
        <Tag size='sm' colorScheme='red' {...defaultTagProps}>
          {translate('notificationCenter.status.failed')}
        </Tag>
      )
    case NotificationStatus.ClaimAvailable:
      return (
        <Tag size='sm' colorScheme='blue' {...defaultTagProps}>
          {translate('notificationCenter.status.claimAvailable')}
        </Tag>
      )
    default:
      return (
        <Tag size='sm' colorScheme='gray' {...defaultTagProps}>
          {translate('notificationCenter.status.unknown')}
        </Tag>
      )
  }
}
