import { Button, Link, Stack, useDisclosure } from '@chakra-ui/react'
import { tcyAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { useActionCenterContext } from '../ActionCenterContext'
import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { getTxLink } from '@/lib/getTxLink'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import type { TcyClaimAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type TcyClaimActionCardProps = {
  action: TcyClaimAction
}

export const TcyClaimActionCard = ({ action }: TcyClaimActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { closeDrawer } = useActionCenterContext()

  const claimAsset = useAppSelector(state =>
    selectAssetById(state, action.tcyClaimActionMetadata.claim.assetId),
  )

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, claimAsset?.chainId ?? ''),
  )

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

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

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      closeDrawer()
      const claim = action.tcyClaimActionMetadata.claim
      navigate(`/tcy/claim/${claim.l1_address}`, { state: { selectedClaim: claim } })
    },
    [navigate, closeDrawer, action.tcyClaimActionMetadata.claim],
  )

  const message = useMemo(() => {
    if (!tcyAsset) return null
    const amountCryptoHuman = fromThorBaseUnit(
      action.tcyClaimActionMetadata.claim.amountThorBaseUnit,
    )
    switch (action.status) {
      case ActionStatus.ClaimAvailable:
        return translate('actionCenter.tcy.claimReady', {
          amount: amountCryptoHuman,
          symbol: tcyAsset.symbol,
        })
      case ActionStatus.Pending:
        return translate('actionCenter.tcy.claimTxPending', {
          amount: amountCryptoHuman,
          symbol: tcyAsset.symbol,
        })
      case ActionStatus.Claimed:
        return translate('actionCenter.tcy.claimTxComplete', {
          amount: amountCryptoHuman,
          symbol: tcyAsset.symbol,
        })
      default:
        throw new Error(`Unsupported TCY Claim Action status: ${action.status}`)
    }
  }, [action.tcyClaimActionMetadata.claim.amountThorBaseUnit, action.status, tcyAsset, translate])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={action.tcyClaimActionMetadata.claim.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [action.tcyClaimActionMetadata.claim.assetId, action.status])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
      </>
    )
  }, [action.status])

  const details = useMemo(() => {
    if (!(claimAsset && feeAsset)) return null

    if (action.status === ActionStatus.ClaimAvailable)
      return (
        <Stack gap={4}>
          <Button width='full' colorScheme='green' onClick={handleClaimClick}>
            {translate('actionCenter.claim')}
          </Button>
        </Stack>
      )

    if (!action.tcyClaimActionMetadata.txHash) return null

    const txLink = getTxLink({
      txId: action.tcyClaimActionMetadata.txHash,
      chainId: claimAsset.chainId,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })

    return (
      <Button width='full' as={Link} isExternal href={txLink}>
        {translate('actionCenter.viewTransaction')}
      </Button>
    )
  }, [
    action.tcyClaimActionMetadata.txHash,
    action.status,
    feeAsset,
    handleClaimClick,
    claimAsset,
    translate,
  ])

  return (
    <ActionCard
      type={action.type}
      displayType={GenericTransactionDisplayType.TCY}
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
