import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ClaimRow as ReusableClaimRow } from 'components/ClaimRow/ClaimRow'
import { ClaimStatus } from 'components/ClaimRow/types'
import { formatSecondsToDuration } from 'lib/utils/time'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'

type ClaimRowProps = {
  claim: ClaimDetails
  status: ClaimStatus
  onClaimClick: (claim: ClaimDetails) => void
}

export const ClaimRow: React.FC<ClaimRowProps> = ({ claim, status, onClaimClick }) => {
  const translate = useTranslate()

  const asset = useAppSelector(state => selectAssetById(state, claim.assetId))

  const amountCryptoPrecision = useMemo(() => {
    return fromBaseUnit(claim.amountCryptoBaseUnit, asset?.precision ?? 0)
  }, [asset, claim])

  const statusText = useMemo(() => {
    if (!claim.timeRemainingSeconds) return ClaimStatus.Available

    return translate('bridge.availableIn', {
      time: formatSecondsToDuration(claim.timeRemainingSeconds),
    })
  }, [claim, translate])

  const handleClaimClick = useCallback(() => {
    onClaimClick(claim)
  }, [claim, onClaimClick])

  if (!asset) return null

  return (
    <ReusableClaimRow
      amountCryptoPrecision={amountCryptoPrecision}
      onClaimClick={handleClaimClick}
      asset={asset}
      actionText={claim.description}
      statusText={statusText}
      status={status}
    />
  )
}
