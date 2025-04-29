import type { CenterProps } from '@chakra-ui/react'
import { Center, CircularProgress } from '@chakra-ui/react'
import { TbCheck } from 'react-icons/tb'

import { NotificationStatus } from '../types'

import { ArrowDownBoldIcon } from '@/components/Icons/ArrowDownBold'
import { ErrorIcon } from '@/components/Icons/ErrorIcon'
import { GenericTxIcon } from '@/components/Icons/GenericTx'

const IconWrapper: React.FC<CenterProps> = props => (
  <Center borderRadius='full' boxSize='100%' {...props} />
)

export const NotificationStatusIcon = ({ status }: { status?: NotificationStatus }) => {
  switch (status) {
    case NotificationStatus.Pending:
      return (
        <IconWrapper bg='blue.500'>
          <CircularProgress
            size='0.85em'
            thickness='1.25em'
            trackColor='whiteAlpha.400'
            color='white'
            isIndeterminate
          />
        </IconWrapper>
      )

    case NotificationStatus.Claimed:
      return (
        <IconWrapper bg='green.600'>
          <ArrowDownBoldIcon />
        </IconWrapper>
      )
    case NotificationStatus.ClaimAvailable:
    case NotificationStatus.Complete:
      return (
        <IconWrapper bg='green.600'>
          <TbCheck strokeWidth={4} />
        </IconWrapper>
      )
    case NotificationStatus.Failed:
    case NotificationStatus.Cancelled:
    case NotificationStatus.Expired:
      return (
        <IconWrapper bg='red.500'>
          <ErrorIcon />
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
