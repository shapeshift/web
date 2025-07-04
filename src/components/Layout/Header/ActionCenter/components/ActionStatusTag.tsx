import type { TagProps } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatus } from '@/state/slices/actionSlice/types'

type ActionStatusTagProps = {
  status: ActionStatus
}

const defaultTagProps: TagProps = {
  px: 1.5,
  py: 0,
  minWidth: 'auto',
  fontWeight: 'medium',
  lineHeight: 1,
}

export const ActionStatusTag = ({ status }: ActionStatusTagProps) => {
  const translate = useTranslate()
  const statusTag = useMemo(() => {
    switch (status) {
      case ActionStatus.Open:
        return (
          <Tag size='sm' colorScheme='blue' {...defaultTagProps}>
            {translate('notificationCenter.status.open')}
          </Tag>
        )
      case ActionStatus.Expired:
        return (
          <Tag size='sm' colorScheme='red' {...defaultTagProps}>
            {translate('notificationCenter.status.expired')}
          </Tag>
        )
      case ActionStatus.Cancelled:
        return (
          <Tag size='sm' colorScheme='red' {...defaultTagProps}>
            {translate('notificationCenter.status.cancelled')}
          </Tag>
        )
      case ActionStatus.Complete:
        return (
          <Tag size='sm' colorScheme='green' {...defaultTagProps}>
            {translate('notificationCenter.status.confirmed')}
          </Tag>
        )
      case ActionStatus.Pending:
        return (
          <Tag size='sm' colorScheme='yellow' {...defaultTagProps}>
            {translate('notificationCenter.status.pending')}
          </Tag>
        )
      case ActionStatus.Failed:
        return (
          <Tag size='sm' colorScheme='red' {...defaultTagProps}>
            {translate('notificationCenter.status.failed')}
          </Tag>
        )
      case ActionStatus.ClaimAvailable:
        return (
          <Tag size='sm' colorScheme='green' {...defaultTagProps}>
            {translate('notificationCenter.status.claimAvailable')}
          </Tag>
        )
      case ActionStatus.Claimed:
        return (
          <Tag size='sm' colorScheme='green' {...defaultTagProps}>
            {translate('notificationCenter.status.claimed')}
          </Tag>
        )
      default:
        return (
          <Tag size='sm' colorScheme='gray' {...defaultTagProps}>
            {translate('notificationCenter.status.unknown')}
          </Tag>
        )
    }
  }, [status, translate])

  return statusTag
}
