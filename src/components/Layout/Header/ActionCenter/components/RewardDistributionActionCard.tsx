import { Button, ButtonGroup, Link, useDisclosure } from '@chakra-ui/react'
import {
  thorchainAssetId,
  uniV2EthFoxArbitrumAssetId,
  usdcOnArbitrumOneAssetId,
} from '@shapeshiftoss/caip'
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
import { RFOX_V3_UPGRADE_EPOCH } from '@/pages/RFOX/constants'
import { getStakingContract } from '@/pages/RFOX/helpers'
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
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const usdcAsset = useAppSelector(state => selectAssetById(state, usdcOnArbitrumOneAssetId))

  const { distribution } = action.rewardDistributionMetadata

  const formattedDate = useMemo(() => {
    return dayjs(action.updatedAt).fromNow()
  }, [action.updatedAt])

  const isRuneReward = useMemo(() => {
    return (
      distribution.stakingContract === getStakingContract(uniV2EthFoxArbitrumAssetId) ||
      distribution.epoch < RFOX_V3_UPGRADE_EPOCH
    )
  }, [distribution.epoch, distribution.stakingContract])

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
          symbol={asset?.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [distribution.amount, isRuneReward, runeAsset, usdcAsset])

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
    const assetId = isRuneReward ? thorchainAssetId : usdcOnArbitrumOneAssetId
    return <ActionIcon assetId={assetId} status={action.status} />
  }, [action.status, isRuneReward])

  const txLink = useMemo(() => {
    if (!distribution.txId || distribution.txId === '') return

    const asset = isRuneReward ? runeAsset : usdcAsset
    if (!asset) return

    return getTxLink({
      txId: distribution.txId,
      chainId: asset.chainId,
      defaultExplorerBaseUrl: asset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [runeAsset, usdcAsset, distribution.txId, isRuneReward])

  const footer = useMemo(() => {
    return <ActionStatusTag status={action.status} />
  }, [action.status])

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
