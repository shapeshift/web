import { Button, Link, Stack, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useActionCenterContext } from '../ActionCenterContext'
import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Row } from '@/components/Row/Row'
import { getTxLink } from '@/lib/getTxLink'
import { formatSmartDate } from '@/lib/utils/time'
import type {
  GenericTransactionDisplayType,
  RfoxClaimAction,
  TcyClaimAction,
} from '@/state/slices/actionSlice/types'
import { ActionStatus, getActionTimestamp } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimActionCardProps = {
  action: RfoxClaimAction | TcyClaimAction
  // The asset to be claimed
  claimAssetId: AssetId
  // Mostly a TCY thing - for most opportunities, that will be the same. It basically means "display asset symbol/amount as one asset (claimAssetId) and icon as another (underlyingAssetId)"
  underlyingAssetId: AssetId
  txHash: string | undefined
  // The tx that created the claim, e.g. an unstake, linked like a bridge card's withdraw
  sourceTxHash?: string
  sourceTxLabel?: string
  // A fixed timestamp, shown while the claim is still cooling down
  claimableAt?: number
  onClaimClick: () => void
  message: string
  displayType: GenericTransactionDisplayType
}

export const ClaimActionCard = ({
  underlyingAssetId,
  claimAssetId,
  txHash,
  sourceTxHash,
  sourceTxLabel,
  claimableAt,
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

  const formattedDate = useMemo(() => formatSmartDate(getActionTimestamp(action)), [action])

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

    const toTxLink = (txId: string) =>
      getTxLink({
        txId,
        chainId: claimAsset.chainId,
        explorerBaseUrl: claimFeeAsset.explorerTxLink,
        address: undefined,
        maybeSafeTx: undefined,
      })

    const rows = [
      sourceTxHash && sourceTxLabel && (
        <Row key='source' fontSize='sm' alignItems='center'>
          <Row.Label>{sourceTxLabel}</Row.Label>
          <Row.Value>
            <Link isExternal href={toTxLink(sourceTxHash)} color='text.link'>
              <MiddleEllipsis value={sourceTxHash} />
            </Link>
          </Row.Value>
        </Row>
      ),
      action.status === ActionStatus.Initiated && claimableAt && (
        <Row key='claimableAt' fontSize='sm'>
          <Row.Label>{translate('actionCenter.claimAvailableOn')}</Row.Label>
          <Row.Value>{new Date(claimableAt).toLocaleString()}</Row.Value>
        </Row>
      ),
      action.status === ActionStatus.ClaimAvailable && (
        <Button key='claim' width='full' colorScheme='green' onClick={handleClaimClick}>
          {translate('common.claim')}
        </Button>
      ),
      action.status !== ActionStatus.ClaimAvailable && txHash && (
        <Button key='tx' width='full' size='sm' as={Link} isExternal href={toTxLink(txHash)}>
          {translate('actionCenter.viewTransaction')}
        </Button>
      ),
    ].filter(Boolean)

    if (!rows.length) return null

    return <Stack gap={4}>{rows}</Stack>
  }, [
    txHash,
    sourceTxHash,
    sourceTxLabel,
    claimableAt,
    action.status,
    claimFeeAsset,
    handleClaimClick,
    claimAsset,
    translate,
  ])

  return (
    <ActionCard
      type={action.type}
      displayType={displayType}
      formattedDate={formattedDate}
      isCollapsable={Boolean(details)}
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
