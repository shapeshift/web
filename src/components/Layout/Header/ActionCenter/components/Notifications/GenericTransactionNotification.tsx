import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { selectWalletActionsSorted } from '@/state/slices/actionSlice/selectors'
import { isGenericTransactionAction } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
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
  const translate = useTranslate()
  const actions = useAppSelector(selectWalletActionsSorted)
  const action = useMemo(
    () => actions.find(a => a.id === actionId && a.type === 'GenericTransaction'),
    [actions, actionId],
  )
  const asset = useAppSelector(state =>
    selectAssetById(
      state,
      action && isGenericTransactionAction(action) ? action?.transactionMetadata?.assetId : '',
    ),
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
                {translate(action.transactionMetadata.message, {
                  ...action.transactionMetadata,
                  amount: action.transactionMetadata.amountCryptoPrecision,
                  symbol: asset?.symbol,
                })}
              </Box>
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
