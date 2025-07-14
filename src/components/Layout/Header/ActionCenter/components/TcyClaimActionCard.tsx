import { tcyAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { ClaimActionCard } from './ClaimActionCard'

import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import type { TcyClaimAction } from '@/state/slices/actionSlice/types'
import { GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

type TcyClaimActionCardProps = {
  action: TcyClaimAction
}

export const TcyClaimActionCard = ({ action }: TcyClaimActionCardProps) => {
  const navigate = useNavigate()

  const handleClaimClick = useCallback(() => {
    const claim = action.tcyClaimActionMetadata.claim
    navigate(`/tcy/claim/${claim.l1_address}`, { state: { selectedClaim: claim } })
  }, [navigate, action.tcyClaimActionMetadata.claim])

  const amountCryptoPrecision = useMemo(
    () => fromThorBaseUnit(action.tcyClaimActionMetadata.claim.amountThorBaseUnit).toFixed(),
    [action.tcyClaimActionMetadata.claim.amountThorBaseUnit],
  )

  return (
    <ClaimActionCard
      displayType={GenericTransactionDisplayType.TCY}
      action={action}
      claimAssetId={tcyAssetId}
      underlyingAssetId={action.tcyClaimActionMetadata.claim.assetId}
      txHash={action.tcyClaimActionMetadata.txHash}
      onClaimClick={handleClaimClick}
      amountCryptoPrecision={amountCryptoPrecision}
    />
  )
}
