import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { actionSlice } from '../../../../../../state/slices/actionSlice/actionSlice'
import { selectAssetById } from '../../../../../../state/slices/selectors'
import { useAppSelector } from '../../../../../../state/store'
import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { RewardDistributionWithMetadata } from '@/pages/RFOX/hooks/useLifetimeRewardDistributionsQuery'
import { ActionStatus } from '@/state/slices/actionSlice/types'

type RewardDistributionNotificationProps = {
  distribution: RewardDistributionWithMetadata
  actionId: string
  handleClick: () => void
  onClose: () => void
} & RenderProps

export const RewardDistributionNotification = ({
  distribution,
  actionId,
  handleClick,
  onClose,
}: RewardDistributionNotificationProps) => {
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const action = actions[actionId]
  const isComplete = action?.status === ActionStatus.Complete

  const rewardDistributionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!runeAsset) return

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={fromBaseUnit(distribution.amount.toString(), runeAsset.precision ?? 0)}
          symbol={runeAsset?.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [distribution.amount, runeAsset])

  const rewardDistributionTitleTranslation = useMemo(() => {
    if (isComplete) return 'actionCenter.rewardDistribution.complete.description'
    return 'actionCenter.rewardDistribution.pending.description'
  }, [isComplete])

  if (!distribution) return null

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
      <Stack spacing={3}>
        <Flex alignItems='center' justifyContent='space-between' pe={6}>
          <HStack spacing={2}>
            <AssetIconWithBadge assetId={thorchainAssetId} size='md'>
              <ActionStatusIcon
                status={isComplete ? ActionStatus.Complete : ActionStatus.Pending}
              />
            </AssetIconWithBadge>

            <Box ml={2}>
              <Text
                flex={1}
                fontSize='sm'
                letterSpacing='0.02em'
                translation={rewardDistributionTitleTranslation}
                components={rewardDistributionTranslationComponents}
              />
            </Box>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
