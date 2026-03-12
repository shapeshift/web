import { Button, ButtonGroup, HStack, Link, Stack, useDisclosure } from '@chakra-ui/react'
import { btcChainId } from '@shapeshiftoss/caip'
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
import { RawText } from '@/components/Text'
import { getTxLink } from '@/lib/getTxLink'
import { middleEllipsis } from '@/lib/utils'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(duration)
dayjs.extend(relativeTime)

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
  onOpenSpeedUp?: (action: GenericTransactionAction) => void
}

export const GenericTransactionActionCard = ({
  action,
  onOpenSpeedUp,
}: GenericTransactionActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { closeDrawer } = useActionCenterContext()
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, action.transactionMetadata.chainId),
  )
  const asset = useAppSelector(state =>
    selectAssetById(state, action.transactionMetadata.assetId ?? ''),
  )

  const isYieldClaim = useMemo(
    () =>
      action.transactionMetadata.displayType === GenericTransactionDisplayType.Claim &&
      !!action.transactionMetadata.yieldId,
    [action.transactionMetadata.displayType, action.transactionMetadata.yieldId],
  )

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      closeDrawer()
      if (action.transactionMetadata.yieldId) {
        navigate(`/yield/${action.transactionMetadata.yieldId}`)
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

  const replacementTxLink = useMemo(() => {
    if (!feeAsset || !action.transactionMetadata.replacedByTxHash) return

    return getTxLink({
      txId: action.transactionMetadata.replacedByTxHash,
      chainId: action.transactionMetadata.chainId,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [action.transactionMetadata.chainId, action.transactionMetadata.replacedByTxHash, feeAsset])

  const originalTxLink = useMemo(() => {
    if (!feeAsset || !action.transactionMetadata.replacesTxHash) return

    return getTxLink({
      txId: action.transactionMetadata.replacesTxHash,
      chainId: action.transactionMetadata.chainId,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [action.transactionMetadata.chainId, action.transactionMetadata.replacesTxHash, feeAsset])

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

  const cooldownExpiryTimestamp = action.transactionMetadata.cooldownExpiryTimestamp
  const cooldownDuration = useMemo(() => {
    if (!cooldownExpiryTimestamp) return undefined
    const remaining = cooldownExpiryTimestamp - Date.now()
    if (remaining <= 0) return undefined
    return dayjs.duration(remaining).humanize()
  }, [cooldownExpiryTimestamp])

  const description = useMemo(() => {
    const {
      btcUtxoRbfTxMetadata: _btcUtxoRbfTxMetadata,
      accountIdsToRefetch: _accountIdsToRefetch,
      confirmedQuote: _confirmedQuote,
      ...serializableMetadata
    } = action.transactionMetadata

    return translate(action.transactionMetadata.message, {
      ...serializableMetadata,
      amount: action.transactionMetadata.amountCryptoPrecision,
      symbol: asset?.symbol,
      newAddress: middleEllipsis(action.transactionMetadata.newAddress ?? ''),
      duration: cooldownDuration,
    })
  }, [action.transactionMetadata, asset?.symbol, cooldownDuration, translate])

  const isCollapsable = !!txLink || (isYieldClaim && action.status === ActionStatus.ClaimAvailable)
  const isSpeedUpEligible =
    action.type === ActionType.Send &&
    action.transactionMetadata.displayType === GenericTransactionDisplayType.SEND &&
    action.transactionMetadata.chainId === btcChainId &&
    action.status === ActionStatus.Pending &&
    !action.transactionMetadata.replacedByTxHash &&
    action.transactionMetadata.isRbfEnabled === true

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
          {isSpeedUpEligible && (
            <Button
              width='full'
              colorScheme='blue'
              onClick={() => {
                onOpenSpeedUp?.(action)
              }}
            >
              {translate('transactionHistory.speedUp')}
            </Button>
          )}
        </ButtonGroup>
        {replacementTxLink && action.transactionMetadata.replacedByTxHash ? (
          <HStack justifyContent='space-between' alignItems='flex-start'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('actionCenter.replacementTransaction')}
            </RawText>
            <Link
              isExternal
              href={replacementTxLink}
              color='blue.300'
              fontSize='sm'
              fontWeight='medium'
            >
              {middleEllipsis(action.transactionMetadata.replacedByTxHash)}
            </Link>
          </HStack>
        ) : null}
        {originalTxLink && action.transactionMetadata.replacesTxHash ? (
          <HStack justifyContent='space-between' alignItems='flex-start'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('actionCenter.originalTransaction')}
            </RawText>
            <Link
              isExternal
              href={originalTxLink}
              color='blue.300'
              fontSize='sm'
              fontWeight='medium'
            >
              {middleEllipsis(action.transactionMetadata.replacesTxHash)}
            </Link>
          </HStack>
        ) : null}
      </Stack>
    )
  }, [
    action,
    handleClaimClick,
    isYieldClaim,
    isSpeedUpEligible,
    onOpenSpeedUp,
    originalTxLink,
    replacementTxLink,
    translate,
    txLink,
  ])

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
