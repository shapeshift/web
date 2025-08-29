import type { CenterProps } from '@chakra-ui/react'
import { Center, CircularProgress } from '@chakra-ui/react'
import { useMemo } from 'react'
import { TbCheck } from 'react-icons/tb'

import { ArrowDownBoldIcon } from '@/components/Icons/ArrowDownBold'
import { ErrorIcon } from '@/components/Icons/ErrorIcon'
import { GenericTxIcon } from '@/components/Icons/GenericTx'
import { ActionStatus } from '@/state/slices/actionSlice/types'

const IconWrapper: React.FC<CenterProps> = props => (
  <Center borderRadius='full' boxSize='100%' {...props} />
)

export const ActionStatusIcon = ({ status }: { status?: ActionStatus }) => {
  const statusIcon = useMemo(() => {
    switch (status) {
      case ActionStatus.Pending:
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

      case ActionStatus.Claimed:
        return (
          <IconWrapper bg='green.600'>
            <ArrowDownBoldIcon />
          </IconWrapper>
        )
      case ActionStatus.ClaimAvailable:
      case ActionStatus.Initiated:
      case ActionStatus.Complete:
        return (
          <IconWrapper bg='green.600'>
            <TbCheck strokeWidth={4} />
          </IconWrapper>
        )
      case ActionStatus.Failed:
      case ActionStatus.Cancelled:
      case ActionStatus.Expired:
        return (
          <IconWrapper bg='red.500'>
            <ErrorIcon />
          </IconWrapper>
        )
      case ActionStatus.AwaitingApproval:
      case ActionStatus.AwaitingSwap:
        return (
          <IconWrapper bg='orange.500'>
            <GenericTxIcon />
          </IconWrapper>
        )
      default:
        return (
          <IconWrapper bg='blue.500'>
            <GenericTxIcon />
          </IconWrapper>
        )
    }
  }, [status])

  return statusIcon
}
