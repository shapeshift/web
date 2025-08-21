import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

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
  handleClick,
  onClose,
}: RewardDistributionNotificationProps) => {
  const isComplete = distribution.status === 'complete'

  const rewardDistributionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={distribution.amount}
          symbol='RUNE'
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [distribution.amount])

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
