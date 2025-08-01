import { Button, Link, Stack, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useActionCenterContext } from '../ActionCenterContext'
import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { getTxLink } from '@/lib/getTxLink'
import type {
  GenericTransactionDisplayType,
  RfoxClaimAction,
  TcyClaimAction,
} from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type ClaimActionCardProps = {
  action: RfoxClaimAction | TcyClaimAction
  // The asset to be claimed
  claimAssetId: AssetId
  // Mostly a TCY thing - for most opportunities, that will be the same. It basically means "display asset symbol/amount as one asset (claimAssetId) and icon as another (underlyingAssetId)"
  underlyingAssetId: AssetId
  txHash: string | undefined
  onClaimClick: () => void
  message: string
  displayType: GenericTransactionDisplayType
}

export const ClaimActionCard = ({
  underlyingAssetId,
  claimAssetId,
  txHash,
  action,
  onClaimClick,
  message,
  displayType,
}: ClaimActionCardProps) => {
  const { closeDrawer } = useActionCenterContext()
  const translate = useTranslate()

  const claimAsset = useAppSelector(state => selectAssetById(state, claimAssetId))

  const claimFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(claimAssetId).chainId),
  )

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent card collapse
      e.stopPropagation()
      // Close the drawer as early as possible
      closeDrawer()

      onClaimClick()
    },
    [onClaimClick, closeDrawer],
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

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false })

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={underlyingAssetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [underlyingAssetId, action.status])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
      </>
    )
  }, [action.status])

  const details = useMemo(() => {
    if (!(claimAsset && claimFeeAsset)) return null

    if (action.status === ActionStatus.ClaimAvailable)
      return (
        <Stack gap={4}>
          <Button width='full' colorScheme='green' onClick={handleClaimClick}>
            {translate('common.claim')}
          </Button>
        </Stack>
      )

    if (!txHash) return null

    const txLink = getTxLink({
      txId: txHash,
      chainId: claimAsset.chainId,
      defaultExplorerBaseUrl: claimFeeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
      txStatus: action.status === ActionStatus.Pending ? TxStatus.Unknown : TxStatus.Confirmed,
    })

    return (
      <Button width='full' as={Link} isExternal href={txLink}>
        {translate('actionCenter.viewTransaction')}
      </Button>
    )
  }, [txHash, action.status, claimFeeAsset, handleClaimClick, claimAsset, translate])

  return (
    <ActionCard
      type={action.type}
      displayType={displayType}
      formattedDate={formattedDate}
      isCollapsable={true}
      isOpen={isOpen}
      onToggle={onToggle}
      description={message}
      icon={icon}
      footer={footer}
    >
      {details}
    </ActionCard>
  )
}
