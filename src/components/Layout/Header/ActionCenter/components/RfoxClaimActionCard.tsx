import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { ClaimActionCard } from './ClaimActionCard'

import { RfoxRoute } from '@/pages/RFOX/types'
import type { RfoxClaimAction } from '@/state/slices/actionSlice/types'
import { GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

type RfoxClaimActionCardProps = {
  action: RfoxClaimAction
}

export const RfoxClaimActionCard = ({ action }: RfoxClaimActionCardProps) => {
  const navigate = useNavigate()

  const handleClaimClick = useCallback(() => {
    const index = action.rfoxClaimActionMetadata.request.index

    navigate(`${RfoxRoute.Claim}/${index}/confirm`, {
      state: {
        selectedUnstakingRequest: action.rfoxClaimActionMetadata.request,
      },
    })
  }, [action, navigate])

  return (
    <ClaimActionCard
      displayType={GenericTransactionDisplayType.RFOX}
      action={action}
      claimAssetId={action.rfoxClaimActionMetadata.request.stakingAssetId}
      underlyingAssetId={action.rfoxClaimActionMetadata.request.stakingAssetId}
      txHash={action.rfoxClaimActionMetadata.txHash}
      onClaimClick={handleClaimClick}
      amountCryptoPrecision={action.rfoxClaimActionMetadata.request.amountCryptoPrecision}
    />
  )
}
