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
  const buyFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(
      state,
      fromAssetId(action.arbitrumBridgeMetadata.destinationAssetId).chainId,
    ),
  )

  const formattedDate = useMemo(() => formatSmartDate(action.updatedAt), [action.updatedAt])

  const isCollapsable =
    action.status === ActionStatus.ClaimAvailable || action.status === ActionStatus.Claimed

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen:
      isCollapsable &&
      (action.status === ActionStatus.ClaimAvailable || action.status === ActionStatus.Initiated),
  })

  const handleClaimClick = useCallback((e: React.MouseEvent) => {
    try {
      e.preventDefault()
      e.stopPropagation()
      setIsClaimModalOpen(true)
    } catch (error) {
      console.error('Error opening claim modal:', error)
    }
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

  const description = useMemo(() => {
    if (!sellAsset || !buyAsset) return ''

    const amountAndSymbol = `${buyAmountCryptoPrecision} ${buyAsset.symbol}`
    const timeText = timeDisplay ? `in ${timeDisplay}` : 'soon'

    switch (action.status) {
      case ActionStatus.Initiated:
        return `Your withdraw of ${amountAndSymbol} will be available ${timeText}.`
      case ActionStatus.ClaimAvailable:
        return `Your bridge of ${amountAndSymbol} is available to claim.`
      case ActionStatus.Claimed:
        return `Your bridge of ${amountAndSymbol} is complete.`
      default:
        return 'Processing...'
    }
  }, [action.status, buyAmountCryptoPrecision, buyAsset, sellAsset, timeDisplay])

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
    if (!(sellAsset && buyAsset && sellFeeAsset && buyFeeAsset)) return null

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
          defaultExplorerBaseUrl: buyFeeAsset.explorerTxLink,
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
    buyFeeAsset,
    action.arbitrumBridgeMetadata.withdrawTxHash,
    action.arbitrumBridgeMetadata.claimTxHash,
    action.status,
    translate,
    handleClaimClick,
  ])

  if (!sellAsset || !buyAsset || !action.arbitrumBridgeMetadata) {
    return null
  }

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
