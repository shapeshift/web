import { Button, ButtonGroup, Link, useDisclosure } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { getTxLink } from '../../../../../lib/getTxLink'
import { selectAssetById } from '../../../../../state/slices/assetsSlice/selectors'
import { useAppSelector } from '../../../../../state/store'
import { AssetIconWithBadge } from '../../../../AssetIconWithBadge'
import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { Amount } from '@/components/Amount/Amount'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { RewardDistributionAction } from '@/state/slices/actionSlice/types'
import { GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'

type RewardDistributionActionCardProps = {
  action: RewardDistributionAction
}

export const RewardDistributionActionCard = ({ action }: RewardDistributionActionCardProps) => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })
  const thorchainAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const { distribution } = action.rewardDistributionMetadata

  const formattedDate = useMemo(() => {
    return dayjs(action.updatedAt).fromNow()
  }, [action.updatedAt])

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

  const description = useMemo(() => {
    const translationKey =
      distribution.status === 'pending'
        ? 'actionCenter.rewardDistribution.pending.description'
        : 'actionCenter.rewardDistribution.complete.description'

    return (
      <Text
        fontSize='sm'
        translation={translationKey}
        components={rewardDistributionTranslationComponents}
      />
    )
  }, [rewardDistributionTranslationComponents, distribution.status])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={thorchainAssetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [action.status])

  const txLink = useMemo(() => {
    if (!thorchainAsset) return
    if (!distribution.txId) return

    return getTxLink({
      txId: distribution.txId,
      chainId: thorchainAsset.chainId,
      defaultExplorerBaseUrl: thorchainAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [thorchainAsset, distribution.txId])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
      </>
    )
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
