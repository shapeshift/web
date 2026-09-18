import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { getRewardAssetId, maybeGetStakingAssetId } from '@/pages/RFOX/helpers'
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
  const rewardAssetId = useMemo(() => {
    const stakingAssetId = maybeGetStakingAssetId(distribution.stakingContract)
    if (!stakingAssetId) return
    return getRewardAssetId(stakingAssetId, distribution.epoch)
  }, [distribution.epoch, distribution.stakingContract])
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId ?? ''))
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const action = actions[actionId]
  const isComplete = action?.status === ActionStatus.Complete

  const rewardDistributionTitleTranslation = useMemo(() => {
    if (isComplete) return 'actionCenter.rewardDistribution.complete.description'
    return 'actionCenter.rewardDistribution.pending.description'
  }, [isComplete])

  const icon = useMemo(() => {
    if (!(action && rewardAssetId)) return undefined
    return <ActionIcon assetId={rewardAssetId} status={action.status} />
  }, [action, rewardAssetId])

  const rewardDistributionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!rewardAsset) return

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={BigAmount.fromBaseUnit({
            value: distribution.amount.toString(),
            precision: rewardAsset.precision ?? 0,
          }).toPrecision()}
          symbol={rewardAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [distribution.amount, rewardAsset])

  const title = useMemo(() => {
    if (!rewardDistributionTranslationComponents) return

    return (
      <Text
        fontSize='sm'
        letterSpacing='0.02em'
        translation={rewardDistributionTitleTranslation}
        components={rewardDistributionTranslationComponents}
      />
    )
  }, [rewardDistributionTitleTranslation, rewardDistributionTranslationComponents])

  if (!distribution || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
