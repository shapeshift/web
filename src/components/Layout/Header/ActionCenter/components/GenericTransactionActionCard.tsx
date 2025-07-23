import { Button, ButtonGroup, Link, Stack, useDisclosure } from '@chakra-ui/react'
import { uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { getTxLink } from '@/lib/getTxLink'
import { firstFourLastFour } from '@/lib/utils'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'
import { foxEthLpAssetId, foxEthPair } from '@/state/slices/opportunitiesSlice/constants'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
}

export const GenericTransactionActionCard = ({ action }: GenericTransactionActionCardProps) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, action.transactionMetadata.chainId),
  )
  const asset = useAppSelector(state =>
    selectAssetById(state, action.transactionMetadata.assetId ?? ''),
  )

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(action.updatedAt)
    const sevenDaysAgo = now.subtract(7, 'day')
    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [action.updatedAt])

  const txLink = useMemo(() => {
    if (!feeAsset) return

    return getTxLink({
      txId: action.transactionMetadata.txHash,
      chainId: action.transactionMetadata.chainId,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [action.transactionMetadata.txHash, action.transactionMetadata.chainId, feeAsset])

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false })

  const icon = useMemo(() => {
    if (asset?.assetId === uniV2EthFoxArbitrumAssetId || asset?.assetId === foxEthLpAssetId) {
      return (
        <AssetIconWithBadge assetId={foxEthPair[0]} secondaryAssetId={foxEthPair[1]} size='md'>
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
      )
    }

    return (
      <AssetIconWithBadge assetId={action.transactionMetadata.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [asset, action.transactionMetadata.assetId, action.status])

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
      displayType={action.transactionMetadata.displayType}
      description={translate(action.transactionMetadata.message, {
        ...action.transactionMetadata,
        amount: action.transactionMetadata.amountCryptoPrecision,
        symbol: asset?.symbol,
        newAddress: firstFourLastFour(action.transactionMetadata.newAddress ?? ''),
      })}
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
