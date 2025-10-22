import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import type { RewardDistributionWithMetadata } from '@/pages/RFOX/hooks/useLifetimeRewardDistributionsQuery'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

  const rewardDistributionTitleTranslation = useMemo(() => {
    if (isComplete) return 'actionCenter.rewardDistribution.complete.description'
    return 'actionCenter.rewardDistribution.pending.description'
  }, [isComplete])

  const icon = useMemo(() => {
    if (!action) return undefined
    return <ActionIcon assetId={thorchainAssetId} status={action.status} />
  }, [action])

  const rewardDistributionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!runeAsset) return

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={fromBaseUnit(distribution.amount.toString(), runeAsset.precision ?? 0)}
          symbol={runeAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [distribution.amount, runeAsset])

  const title = useMemo(() => {
    if (!runeAsset) return undefined

    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={rewardDistributionTitleTranslation}
        components={rewardDistributionTranslationComponents}
      />
    )
  }, [runeAsset, rewardDistributionTitleTranslation, rewardDistributionTranslationComponents])

  if (!distribution || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
