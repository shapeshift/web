import { Button, ButtonGroup, Link, useDisclosure } from '@chakra-ui/react'
import { BigAmount } from '@shapeshiftoss/utils'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'
import { ActionIcon } from './ActionIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { Amount } from '@/components/Amount/Amount'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { getTxLink } from '@/lib/getTxLink'
import { getRewardAssetId, maybeGetStakingAssetId } from '@/pages/RFOX/helpers'
import type { RewardDistributionAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RewardDistributionActionCardProps = {
  action: RewardDistributionAction
}

export const RewardDistributionActionCard = ({ action }: RewardDistributionActionCardProps) => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })
  const { distribution } = action.rewardDistributionMetadata

  const rewardAssetId = useMemo(() => {
    const stakingAssetId = maybeGetStakingAssetId(distribution.stakingContract)
    if (!stakingAssetId) return
    return getRewardAssetId(stakingAssetId, distribution.epoch)
  }, [distribution.epoch, distribution.stakingContract])
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId ?? ''))

  const formattedDate = useMemo(() => {
    return dayjs(action.updatedAt).fromNow()
  }, [action.updatedAt])

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

  const description = useMemo(() => {
    const translationKey =
      action.status === ActionStatus.Initiated
        ? 'actionCenter.rewardDistribution.pending.description'
        : 'actionCenter.rewardDistribution.complete.description'

    return (
      <Text
        fontSize='sm'
        translation={translationKey}
        components={rewardDistributionTranslationComponents}
      />
    )
  }, [rewardDistributionTranslationComponents, action.status])

  const icon = useMemo(() => {
    if (!rewardAssetId) return
    return <ActionIcon assetId={rewardAssetId} status={action.status} />
  }, [action.status, rewardAssetId])

  const txLink = useMemo(() => {
    if (!distribution.txId || distribution.txId === '') return

    if (!rewardAsset) return

    return getTxLink({
      txId: distribution.txId,
      chainId: rewardAsset.chainId,
      explorerBaseUrl: rewardAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [distribution.txId, rewardAsset])

  const footer = useMemo(() => {
    return <ActionStatusTag status={action.status} />
  }, [action.status])

  // An unrecognised staking contract leaves no reward to describe, and the card is only the reward
  if (!rewardAsset) return null

  return (
    <ActionCard
      type={action.type}
      formattedDate={formattedDate}
      displayType={GenericTransactionDisplayType.RFOX}
      isCollapsable={distribution.txId ? true : false}
      isOpen={isOpen}
      onToggle={onToggle}
      description={description}
      icon={icon}
      footer={footer}
    >
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('actionCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </ActionCard>
  )
}
