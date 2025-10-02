import { Button, Link, Stack, useDisclosure } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { ArbitrumBridgeClaimModal } from './ArbitrumBridgeClaimModal'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Row } from '@/components/Row/Row'
import { getTxLink } from '@/lib/getTxLink'
import { fromBaseUnit } from '@/lib/math'
import { formatSecondsToDuration, formatSmartDate } from '@/lib/utils/time'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)
dayjs.extend(duration)

type ArbitrumBridgeWithdrawActionCardProps = {
  action: ArbitrumBridgeWithdrawAction
}

export const ArbitrumBridgeWithdrawActionCard = ({
  action,
}: ArbitrumBridgeWithdrawActionCardProps) => {
  const translate = useTranslate()
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const handleCloseModal = useCallback(() => setIsClaimModalOpen(false), [])

  const sellAsset = useAppSelector(state =>
    selectAssetById(state, action.arbitrumBridgeMetadata.assetId),
  )
  const buyAsset = useAppSelector(state =>
    selectAssetById(state, action.arbitrumBridgeMetadata.destinationAssetId),
  )
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(action.arbitrumBridgeMetadata.assetId).chainId),
  )
  const destinationFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(
      state,
      fromAssetId(action.arbitrumBridgeMetadata.destinationAssetId).chainId,
    ),
  )

  const formattedDate = useMemo(() => formatSmartDate(action.updatedAt), [action.updatedAt])
  const isCollapsable =
    action.status === ActionStatus.ClaimAvailable || action.status === ActionStatus.Claimed
  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: action.status === ActionStatus.ClaimAvailable,
  })

  const handleClaimClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsClaimModalOpen(true)
  }, [])

  const timeDisplay = useMemo(() => {
    const claimDetails = action.arbitrumBridgeMetadata.claimDetails
    const timeRemaining =
      claimDetails?.timeRemainingSeconds ?? action.arbitrumBridgeMetadata.timeRemainingSeconds

    if (!timeRemaining || timeRemaining <= 0) return null

    return formatSecondsToDuration(timeRemaining)
  }, [
    action.arbitrumBridgeMetadata.claimDetails,
    action.arbitrumBridgeMetadata.timeRemainingSeconds,
  ])

  const buyAmountCryptoPrecision = useMemo(() => {
    if (!buyAsset) return '0'
    return fromBaseUnit(action.arbitrumBridgeMetadata.amountCryptoBaseUnit, buyAsset.precision)
  }, [action.arbitrumBridgeMetadata.amountCryptoBaseUnit, buyAsset])

  const timeText = useMemo(() => {
    if (!timeDisplay) return translate('common.available')
    return translate('bridge.availableIn', { time: timeDisplay })
  }, [timeDisplay, translate])

  const description = useMemo(() => {
    if (!sellAsset || !buyAsset) return null

    const amountAndSymbol = `${buyAmountCryptoPrecision} ${buyAsset.symbol}`

    switch (action.status) {
      case ActionStatus.Initiated:
        return translate('actionCenter.bridge.pendingWithdraw', { amountAndSymbol, timeText })
      case ActionStatus.ClaimAvailable:
        return translate('actionCenter.bridge.claimAvailable', { amountAndSymbol })
      case ActionStatus.Claimed:
        return translate('actionCenter.bridge.complete', { amountAndSymbol })
      default:
        return translate('actionCenter.bridge.processing')
    }
  }, [action.status, buyAmountCryptoPrecision, buyAsset, sellAsset, timeText, translate])

  const icon = useMemo(() => {
    if (!sellAsset) return null
    return (
      <AssetIconWithBadge assetId={sellAsset.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [sellAsset, action.status])

  const footer = useMemo(() => <ActionStatusTag status={action.status} />, [action.status])

  const details = useMemo(() => {
    if (!(sellAsset && buyAsset && sellFeeAsset && destinationFeeAsset)) return null

    const withdrawTxLink = getTxLink({
      txId: action.arbitrumBridgeMetadata.withdrawTxHash,
      chainId: sellAsset.chainId,
      defaultExplorerBaseUrl: sellFeeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })

    const claimTxLink = action.arbitrumBridgeMetadata.claimTxHash
      ? getTxLink({
          txId: action.arbitrumBridgeMetadata.claimTxHash,
          chainId: buyAsset.chainId,
          defaultExplorerBaseUrl: destinationFeeAsset.explorerTxLink,
          address: undefined,
          maybeSafeTx: undefined,
        })
      : null

    return (
      <Stack gap={4}>
        {action.status === ActionStatus.Initiated && (
          <Row fontSize='sm' alignItems='center'>
            <Row.Label>{translate('actionCenter.bridge.transactionInitiated')}</Row.Label>
            <Row.Value>
              <Link isExternal href={withdrawTxLink} color='text.link'>
                <MiddleEllipsis value={action.arbitrumBridgeMetadata.withdrawTxHash} />
              </Link>
            </Row.Value>
          </Row>
        )}
        {action.status === ActionStatus.ClaimAvailable && (
          <Row fontSize='sm' alignItems='center'>
            <Row.Label>{translate('actionCenter.bridge.claimWithdraw')}</Row.Label>
            <Row.Value>
              <Button size='sm' colorScheme='green' onClick={handleClaimClick}>
                {translate('common.claim')}
              </Button>
            </Row.Value>
          </Row>
        )}
        {action.status === ActionStatus.Claimed && (
          <>
            <Row fontSize='sm' alignItems='center'>
              <Row.Label>{translate('actionCenter.bridge.withdrawTx')}</Row.Label>
              <Row.Value>
                <Link isExternal href={withdrawTxLink} color='text.link'>
                  <MiddleEllipsis value={action.arbitrumBridgeMetadata.withdrawTxHash} />
                </Link>
              </Row.Value>
            </Row>
            {action.arbitrumBridgeMetadata.claimTxHash && claimTxLink && (
              <Row fontSize='sm' alignItems='center'>
                <Row.Label>{translate('actionCenter.bridge.claimTx')}</Row.Label>
                <Row.Value>
                  <Link isExternal href={claimTxLink} color='text.link'>
                    <MiddleEllipsis value={action.arbitrumBridgeMetadata.claimTxHash} />
                  </Link>
                </Row.Value>
              </Row>
            )}
          </>
        )}
      </Stack>
    )
  }, [
    sellAsset,
    buyAsset,
    sellFeeAsset,
    destinationFeeAsset,
    action.arbitrumBridgeMetadata.withdrawTxHash,
    action.arbitrumBridgeMetadata.claimTxHash,
    action.status,
    translate,
    handleClaimClick,
  ])

  if (!sellAsset || !buyAsset || !action.arbitrumBridgeMetadata) return null

  return (
    <>
      <ActionCard
        type={action.type}
        displayType={GenericTransactionDisplayType.Bridge}
        formattedDate={formattedDate}
        isCollapsable={isCollapsable}
        isOpen={isOpen}
        onToggle={onToggle}
        description={description}
        icon={icon}
        footer={footer}
      >
        {details}
      </ActionCard>
      {isClaimModalOpen && (
        <ArbitrumBridgeClaimModal
          action={action}
          isOpen={isClaimModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
