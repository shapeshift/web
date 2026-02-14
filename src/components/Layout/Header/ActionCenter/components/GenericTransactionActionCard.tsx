import { Button, ButtonGroup, Link, Stack, useDisclosure } from '@chakra-ui/react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { getTxLink } from '@/lib/getTxLink'
import { middleEllipsis } from '@/lib/utils'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(duration)
dayjs.extend(relativeTime)

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
}

export const GenericTransactionActionCard = ({ action }: GenericTransactionActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { closeDrawer } = useActionCenterContext()
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, action.transactionMetadata.chainId),
  )
  const asset = useAppSelector(state =>
    selectAssetById(state, action.transactionMetadata.assetId ?? ''),
  )

  const isYieldClaim =
    action.transactionMetadata.displayType === GenericTransactionDisplayType.Claim &&
    !!action.transactionMetadata.yieldId

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      closeDrawer()
      if (action.transactionMetadata.yieldId) {
        navigate(`/yields/${action.transactionMetadata.yieldId}`)
      }
    },
    [closeDrawer, navigate, action.transactionMetadata.yieldId],
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
    return (
      <AssetIconWithBadge assetId={action.transactionMetadata.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [action.transactionMetadata.assetId, action.status])

  const footer = useMemo(() => {
    return <ActionStatusTag status={action.status} />
  }, [action.status])

  const cooldownDuration = useMemo(() => {
    const { cooldownExpiryTimestamp } = action.transactionMetadata
    if (!cooldownExpiryTimestamp) return undefined
    const remaining = cooldownExpiryTimestamp - Date.now()
    if (remaining <= 0) return undefined
    return dayjs.duration(remaining).humanize()
  }, [action.transactionMetadata])

  const description = useMemo(
    () =>
      translate(action.transactionMetadata.message, {
        ...action.transactionMetadata,
        amount: action.transactionMetadata.amountCryptoPrecision,
        symbol: asset?.symbol,
        newAddress: middleEllipsis(action.transactionMetadata.newAddress ?? ''),
        duration: cooldownDuration,
      }),
    [action.transactionMetadata, asset?.symbol, cooldownDuration, translate],
  )

  const isCollapsable = !!txLink || (isYieldClaim && action.status === ActionStatus.ClaimAvailable)

  const details = useMemo(() => {
    if (isYieldClaim && action.status === ActionStatus.ClaimAvailable) {
      return (
        <Stack gap={4}>
          <Button width='full' colorScheme='green' onClick={handleClaimClick}>
            {translate('common.claim')}
          </Button>
        </Stack>
      )
    }

    return (
      <Stack gap={4}>
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('actionCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      </Stack>
    )
  }, [action.status, handleClaimClick, isYieldClaim, translate, txLink])

  return (
    <ActionCard
      formattedDate={formattedDate}
      isCollapsable={isCollapsable}
      isOpen={isOpen}
      type={action.type}
      displayType={action.transactionMetadata.displayType}
      description={description}
      icon={icon}
      footer={footer}
      onToggle={onToggle}
    >
      {details}
    </ActionCard>
  )
}
