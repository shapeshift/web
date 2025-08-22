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
            {translate('actionCenter.status.open')}
          </Tag>
        )
      case ActionStatus.Expired:
        return (
          <Tag size='sm' colorScheme='red' {...defaultTagProps}>
            {translate('actionCenter.status.expired')}
          </Tag>
        )
      case ActionStatus.Cancelled:
        return (
          <Tag size='sm' colorScheme='red' {...defaultTagProps}>
            {translate('actionCenter.status.cancelled')}
          </Tag>
        )
      case ActionStatus.Complete:
        return (
          <Tag size='sm' colorScheme='green' {...defaultTagProps}>
            {translate('actionCenter.status.confirmed')}
          </Tag>
        )
      case ActionStatus.Pending:
        return (
          <Tag size='sm' colorScheme='yellow' {...defaultTagProps}>
            {translate('actionCenter.status.pending')}
          </Tag>
        )
      case ActionStatus.Failed:
        return (
          <Tag size='sm' colorScheme='red' {...defaultTagProps}>
            {translate('actionCenter.status.failed')}
          </Tag>
        )
      case ActionStatus.ClaimAvailable:
        return (
          <Tag size='sm' colorScheme='green' {...defaultTagProps}>
            {translate('actionCenter.status.claimAvailable')}
          </Tag>
        )
      case ActionStatus.Claimed:
        return (
          <Tag size='sm' colorScheme='green' {...defaultTagProps}>
            {translate('actionCenter.status.claimed')}
          </Tag>
        )
      case ActionStatus.Initiated:
        return (
          <Tag size='sm' colorScheme='blue' {...defaultTagProps}>
            {translate('actionCenter.status.initiated')}
          </Tag>
        )
      case ActionStatus.AwaitingApproval:
        return (
          <Tag size='sm' colorScheme='orange' {...defaultTagProps}>
            {translate('actionCenter.status.awaitingApproval')}
          </Tag>
        )
      case ActionStatus.AwaitingSwap:
        return (
          <Tag size='sm' colorScheme='orange' {...defaultTagProps}>
            {translate('actionCenter.status.awaitingSwap')}
          </Tag>
        )
      default:
        return (
          <Tag size='sm' colorScheme='gray' {...defaultTagProps}>
            {translate('actionCenter.status.unknown')}
          </Tag>
        )
    }
  }, [status, translate])

  return statusTag
}
