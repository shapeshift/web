import { Button, ButtonGroup, Link, Stack, useDisclosure } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { getTxLink } from '@/lib/getTxLink'
import { formatSmartDate } from '@/lib/utils/time'
import type { EvergreenDepositAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { foxEthPair } from '@/state/slices/opportunitiesSlice/constants'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type EvergreenDepositActionCardProps = {
  action: EvergreenDepositAction
}

export const EvergreenDepositActionCard = ({ action }: EvergreenDepositActionCardProps) => {
  const formattedDate = useMemo(() => {
    return formatSmartDate(action.updatedAt)
  }, [action.updatedAt])

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: action.status === ActionStatus.Pending,
  })

  const translate = useTranslate()

  const { lpAssetId, depositAmountCryptoPrecision, stakeTxHash, accountId } =
    action.evergreenDepositMetadata

  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))

  const depositNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    return {
      depositAmountAndSymbol: (
        <Amount.Crypto
          value={depositAmountCryptoPrecision}
          symbol={lpAsset?.symbol ?? ''}
          fontWeight='bold'
          fontSize='sm'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [depositAmountCryptoPrecision, lpAsset?.symbol])

  const title = useMemo(() => {
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

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, lpAsset?.chainId ?? ''))
  const txLink = useMemo(() => {
    if (!feeAsset || !stakeTxHash || !accountId) return

    return getTxLink({
      txId: stakeTxHash,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: fromAccountId(accountId).account,
      chainId: fromAccountId(accountId).chainId,
      maybeSafeTx: undefined,
    })
  }, [feeAsset, stakeTxHash, accountId])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={foxEthPair[0]} secondaryAssetId={foxEthPair[1]} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [action.status])

  const description = useMemo(() => {
    return (
      <Text
        fontSize='sm'
        translation={title}
        components={depositNotificationTranslationComponents}
      />
    )
  }, [title, depositNotificationTranslationComponents])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
      </>
    )
  }, [action.status])

  return (
    <ActionCard
      formattedDate={formattedDate}
      isCollapsable={!!txLink}
      isOpen={isOpen}
      type={action.type}
      description={description}
      icon={icon}
      footer={footer}
      onToggle={onToggle}
    >
      <Stack gap={4}>
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('actionCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      </Stack>
    </ActionCard>
  )
}
