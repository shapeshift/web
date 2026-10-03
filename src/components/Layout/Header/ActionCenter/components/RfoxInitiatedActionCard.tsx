import { Button, Link, useDisclosure } from '@chakra-ui/react'
import { uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { getTxLink } from '@/lib/getTxLink'
import { middleEllipsis } from '@/lib/utils'
import { formatSmartDate } from '@/lib/utils/time'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { getActionTimestamp } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'
import { foxEthLpAssetId, foxEthPair } from '@/state/slices/opportunitiesSlice/constants'
import { useAppSelector } from '@/state/store'

type RfoxInitiatedActionCardProps = {
  action: GenericTransactionAction
}

export const RfoxInitiatedActionCard = ({ action }: RfoxInitiatedActionCardProps) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, action.transactionMetadata.chainId),
  )
  const asset = useAppSelector(state =>
    selectAssetById(state, action.transactionMetadata.assetId ?? ''),
  )

  const formattedDate = useMemo(() => formatSmartDate(getActionTimestamp(action)), [action])

  const txLink = useMemo(() => {
    if (!feeAsset) return

    return getTxLink({
      txId: action.transactionMetadata.txHash,
      chainId: action.transactionMetadata.chainId,
      explorerBaseUrl: feeAsset.explorerTxLink,
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
    return <ActionStatusTag status={action.status} />
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
        newAddress: middleEllipsis(action.transactionMetadata.newAddress ?? ''),
      })}
      icon={icon}
      footer={footer}
      onToggle={onToggle}
    >
      <Button width='full' size='sm' as={Link} isExternal href={txLink}>
        {translate('actionCenter.viewTransaction')}
      </Button>
    </ActionCard>
  )
}
