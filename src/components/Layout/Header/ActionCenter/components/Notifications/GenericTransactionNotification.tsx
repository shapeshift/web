import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { firstFourLastFour } from '@/lib/utils'
import { selectWalletGenericTransactionActionsSorted } from '@/state/slices/actionSlice/selectors'
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
  const actions = useAppSelector(selectWalletGenericTransactionActionsSorted)
  const action = useMemo(() => actions.find(action => action.id === actionId), [actions, actionId])
  const asset = useAppSelector(state =>
    selectAssetById(state, action?.transactionMetadata?.assetId ?? ''),
  )

  const icon = useMemo(() => {
    if (!action) return
    return (
      <AssetIconWithBadge assetId={action.transactionMetadata.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [action])

  if (!action) return null

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
      <Stack spacing={3}>
        <Flex alignItems='center' justifyContent='space-between' pe={6}>
          <HStack spacing={2}>
            {icon}
            <Box ml={2}>
              <Box fontSize='sm' letterSpacing='0.02em'>
                {translate(action.transactionMetadata.message, {
                  ...action.transactionMetadata,
                  amount: action.transactionMetadata.amountCryptoPrecision,
                  symbol: asset?.symbol,
                  newAddress: firstFourLastFour(action.transactionMetadata.newAddress ?? ''),
                })}
              </Box>
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
