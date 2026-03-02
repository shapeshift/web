import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import {
  thorchainAssetId,
  uniV2EthFoxArbitrumAssetId,
  usdcOnArbitrumOneAssetId,
} from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
import { RFOX_V3_UPGRADE_EPOCH } from '@/pages/RFOX/constants'
import { getStakingContract } from '@/pages/RFOX/helpers'
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
  const usdcAsset = useAppSelector(state => selectAssetById(state, usdcOnArbitrumOneAssetId))
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const action = actions[actionId]
  const isComplete = action?.status === ActionStatus.Complete

  const rewardDistributionTitleTranslation = useMemo(() => {
    if (isComplete) return 'actionCenter.rewardDistribution.complete.description'
    return 'actionCenter.rewardDistribution.pending.description'
  }, [isComplete])

  const isRuneReward = useMemo(() => {
    return (
      distribution.stakingContract === getStakingContract(uniV2EthFoxArbitrumAssetId) ||
      distribution.epoch < RFOX_V3_UPGRADE_EPOCH
    )
  }, [distribution.epoch, distribution.stakingContract])

  const icon = useMemo(() => {
    if (!action) return undefined
    const assetId = isRuneReward ? thorchainAssetId : usdcOnArbitrumOneAssetId
    return <ActionIcon assetId={assetId} status={action.status} />
  }, [action, isRuneReward])

  const rewardDistributionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    const asset = isRuneReward ? runeAsset : usdcAsset
    if (!asset) return

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={BigAmount.fromBaseUnit({
            value: distribution.amount.toString(),
            precision: asset.precision ?? 0,
          }).toPrecision()}
          symbol={asset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [distribution.amount, isRuneReward, runeAsset, usdcAsset])

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
