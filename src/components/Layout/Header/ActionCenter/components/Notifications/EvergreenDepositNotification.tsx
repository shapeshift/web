import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { EvergreenDepositAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { foxEthPair } from '@/state/slices/opportunitiesSlice/constants'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EvergreenDepositNotificationProps = {
  handleClick: () => void
  action: EvergreenDepositAction
} & RenderProps

export const EvergreenDepositNotification = ({
  handleClick,
  action,
  onClose,
}: EvergreenDepositNotificationProps) => {
  const { lpAssetId, depositAmountCryptoPrecision } = action.evergreenDepositMetadata

  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))

  const depositNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    return {
      depositAmountAndSymbol: (
        <Amount.Crypto
          value={depositAmountCryptoPrecision}
          symbol={lpAsset?.symbol ?? ''}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [depositAmountCryptoPrecision, lpAsset?.symbol])

  const depositTranslation = useMemo(() => {
    switch (action.status) {
      case ActionStatus.Pending:
        return 'actionCenter.deposit.pending'
      case ActionStatus.Complete:
        return 'actionCenter.deposit.complete'
      case ActionStatus.Failed:
        return 'actionCenter.deposit.failed'
      default:
        return ''
    }
  }, [action.status])

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
      <Stack spacing={3}>
        <Flex alignItems='center' justifyContent='space-between' pe={6}>
          <HStack spacing={2}>
            <AssetIconWithBadge assetId={foxEthPair[0]} secondaryAssetId={foxEthPair[1]} size='md'>
              <ActionStatusIcon status={action?.status} />
            </AssetIconWithBadge>

            <Box ml={2}>
              <Text
                flex={1}
                fontSize='sm'
                letterSpacing='0.02em'
                translation={depositTranslation}
                components={depositNotificationTranslationComponents}
              />
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
