import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionIcon } from '../ActionIcon'

import { StandardToast } from '@/components/Toast/StandardToast'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
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
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
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

  const title = useMemo(() => {
    if (!runeAsset) return undefined

    const amountAndSymbol = toCrypto(
      fromBaseUnit(distribution.amount.toString(), runeAsset.precision ?? 0),
      runeAsset.symbol,
      {
        maximumFractionDigits: 6,
        omitDecimalTrailingZeros: true,
      },
    )

    return translate(rewardDistributionTitleTranslation, {
      amountAndSymbol,
    })
  }, [distribution.amount, runeAsset, rewardDistributionTitleTranslation, toCrypto, translate])

  if (!distribution || !icon || !title) return null

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
