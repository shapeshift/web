import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { selectWalletActionsSorted } from '@/state/slices/actionSlice/selectors'
import { isGenericTransactionAction } from '@/state/slices/actionSlice/types'
import { useAppSelector } from '@/state/store'

export type GenericTransactionNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

export const GenericTransactionNotification = ({
  handleClick,
  actionId,
  onClose,
}: GenericTransactionNotificationProps) => {
  const actions = useAppSelector(selectWalletActionsSorted)
  const action = useMemo(
    () => actions.find(a => a.id === actionId && a.type === 'GenericTransaction'),
    [actions, actionId],
  )

  if (!action) return null
  if (!isGenericTransactionAction(action)) return null

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
      <Stack spacing={3}>
        <Flex alignItems='center' justifyContent='space-between' pe={6}>
          <HStack spacing={2}>
            <AssetIconWithBadge assetId={action.transactionMetadata.assetId} size='md'>
              <ActionStatusIcon status={action.status} />
            </AssetIconWithBadge>
            <Box ml={2}>
              <Box fontSize='sm' letterSpacing='0.02em'>
                {action.transactionMetadata.message}
              </Box>
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
