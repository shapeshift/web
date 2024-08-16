import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { ClaimRow as ReusableClaimRow } from 'components/ClaimRow/ClaimRow'
import { ClaimStatus } from 'components/ClaimRow/types'
import { formatSecondsToDuration } from 'lib/utils/time'
import { selectRelatedAssetIdsByAssetId } from 'state/slices/related-assets-selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { Claim } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimTx } from './hooks/useArbitrumClaimTx'

type ClaimRowProps = {
  claim: Claim
  status: ClaimStatus
  onClaimClick?: () => void
}

export const ClaimRow: React.FC<ClaimRowProps> = ({ claim, status, onClaimClick }) => {
  const actionText = 'Bridge via Arbitrum'

  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsByAssetId(state, { assetId: claim.tx.transfers[0]?.assetId }),
  )

  console.log({ relatedAssetIds })

  const assetId = useMemo(() => {
    return relatedAssetIds.find(assetId => fromAssetId(assetId).chainId === ethChainId)
  }, [relatedAssetIds])

  console.log({ assetId })

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  console.log({ asset })

  const { evmFeesResult, claimMutation } = useArbitrumClaimTx(claim)

  const statusText = useMemo(() => {
    if (!claim.timeRemainingSeconds) return ClaimStatus.Available
    return `Available in ${formatSecondsToDuration(claim.timeRemainingSeconds)}`
  }, [claim.timeRemainingSeconds])

  const handleClaimClick = useCallback(() => {
    onClaimClick && onClaimClick()
  }, [onClaimClick])

  if (!asset) return null

  return (
    <ReusableClaimRow
      amountCryptoPrecision={fromBaseUnit(claim.tx.transfers[0]?.value, asset.precision)}
      onClaimClick={handleClaimClick}
      asset={asset}
      actionText={actionText}
      statusText={statusText}
      status={status}
    />
  )
}
